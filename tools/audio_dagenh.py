"""Sound for the Dagen H short: the 1.15x voice, a light plucked folk bed that stops when the store is gone, room and
country beds, and story SFX on their words (CC0 one-shots in assets/sfx plus synthesized wind, crickets, birds,
engine and pen scratches). Every cue is leveled against the voice.
    python tools/audio_agloe.py   -> out/audio/premaster.wav, then the two-pass loudnorm in tools/master.sh"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 33.3
N = int(TOTAL * SR)
WORDS = json.loads((ROOT / "out/lake/words.json").read_text())


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
x = load(ROOT / "out/lake/vo.wav")
v[: min(N, len(x))] = x[:N]
v = v / np.abs(v).max() * 0.7
VPEAK = np.abs(v).max()
SRMS = rms(v[np.abs(v) > 0.02])
duck = lp(np.abs(v), 3, 1)
duck /= duck.max() + 1e-9
t_all = tt(N)


def level(clip, under=8.0):
    """a one-shot: peak `under` dB below the voice peak, and its loudest 100 ms at least 6 dB under the speech RMS"""
    c = clip / (np.abs(clip).max() + 1e-9) * VPEAK * db(-under)
    w = int(0.1 * SR)
    if len(c) > w:
        loud = max(rms(c[i: i + w]) for i in range(0, len(c) - w, w // 4))
        cap = SRMS * db(-6)
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
    "every": "every", "stops": "stops", "millions": "millions", "nothing": "nothing", "minutes": "minutes", "then": "then",
    "its": "it's", "s1967": "1967", "twelve": "twelve", "voted": "voted", "about": "about", "e83": "eighty-three", "no": "no",
    "gov": "government", "anyway": "anyway", "their": "their", "right2": ("right", 2), "swedish": "swedish", "left2": ("left", 2),
    "result": "result", "surprised": "surprised", "in2": ("in", 2), "accidents": "accidents", "because": "because",
    "last": "last", "joins": "joins", "five2": ("five", 2),
}.items()}

# -- the street at 4:50: engines rolling to a stop, brakes, a whistle, the clock
place(fx, level(engine(T["stops"] + 0.3, 38, 30, (12, 7)), 12), 0.0)
for k, d in enumerate([-0.35, -0.1, 0.15]):
    place(fx, level(squeal(0.3 + 0.05 * k), 15 + k), T["stops"] + d)
place(fx, level(whistle(0.55), 9), T["stops"] + 0.35)
for k in range(int((T["nothing"] - 0.3) / 0.5)):
    place(fx, level(tick(40 + k), 17), 0.3 + k * 0.5)
for k in range(int((T["then"] - T["nothing"]) / 0.12)):  # the minutes run: fast ticking
    place(fx, level(tick(90 + k), 17), T["nothing"] + k * 0.12)
P("cloth.wav", T["millions"] + 0.1, 14)
# -- everyone crosses: engines start and move
place(fx, level(engine(3.0, 36, 52, (8, 14), seed=5), 9), T["then"] + 0.05)
P("pluck_001.ogg", T["s1967"] + 0.05, 10)
# -- the vote
P("paper_01.ogg", T["voted"] + 0.35, 10)
for k in range(9):
    P("pluck_001.ogg", T["e83"] + 0.1 * k, 15)
P("error_003.ogg", T["no"] - 0.02, 8)
P("hit_02.ogg", T["no"], 11)
# -- the stamp
P("paper_02.ogg", T["gov"] + 0.05, 15)
P("slam_02.ogg", T["anyway"] - 0.02, 5)
# -- the border, the open car, the horn
place(fx, level(engine(1.5, 44, 50, (14, 15), seed=7), 13), T["their"] + 0.05)
place(fx, level(engine(T["result"] - T["swedish"], 48, 54, (16, 18), seed=8), 11), T["swedish"])
place(fx, level(horn(), 9), T["left2"] + 0.05)
place(fx, level(horn(0.2), 10), T["left2"] + 0.42)
# -- the chart
P("paper_03.ogg", T["result"] + 0.05, 11)
P("question_001.ogg", T["surprised"] + 0.1, 11)
for k in range(4):
    P("drop_001.ogg", T["accidents"] + 0.15 + k * 0.22, 9)
# -- careful driving: a slow, low engine
place(fx, level(engine(T["last"] - T["because"], 32, 34, (7, 7.5), seed=11), 12), T["because"])
# -- five o'clock: the last car, the chime
place(fx, level(engine(2.0, 36, 48, (8, 13), seed=12), 10), T["joins"] - 0.1)
P("bell_01.ogg", T["five2"] + 0.05, 6)
place(fx, level(whoosh(0.26, 500, 3000, 3), 16), T["twelve"] - 0.12)
for w in ["gov", "their", "swedish", "result", "because", "last"]:
    place(fx, level(whoosh(0.26, 500, 3000, hash(w) % 97), 16), T[w] - 0.12)

# ------------------------------------------------------------------ beds: night street, rooms, day country with birds, dawn birds
bed = np.zeros(N)
def gate(a, b, fade=0.15):
    return np.clip((t_all - a) / fade, 0, 1) * np.clip((b - t_all) / fade, 0, 1)
night = lp(noise(N, 3), 500)
night = night / rms(night) * SRMS * db(-27)
bed += night * gate(0, T["twelve"] - 0.06)
room = lp(noise(N, 2), 400)
room = room / rms(room) * SRMS * db(-31)
bed += room * (gate(T["twelve"] - 0.06, T["their"] - 0.06) + gate(T["result"] - 0.06, T["because"] - 0.06))
wind = lp(noise(N, 4), 800) * (0.6 + 0.4 * np.sin(t_all * 0.7))
wind = wind / rms(wind) * SRMS * db(-25)
bed += wind * (gate(T["their"] - 0.06, T["result"] - 0.06) + gate(T["because"] - 0.06, T["last"] - 0.06) + gate(T["last"] - 0.06, TOTAL))
for a, b in [(T["their"], T["result"]), (T["because"], TOTAL)]:
    k = 0
    at = a + 0.3
    while at < b - 0.2:
        place(bed, chirp(3400 + 300 * (k % 3), 2600, 0.09) * SRMS * db(-13), at)
        place(bed, chirp(3600, 3000, 0.07) * SRMS * db(-15), at + 0.14)
        k += 1
        at += 0.7 + 0.2 * (k % 2)

# ------------------------------------------------------------------ music: a light plucked loop at 104 BPM in G
def pluck(f, dur=0.45, bright=0.4):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 7) * env(n, 0.002, 0.05)

mus = np.zeros(N)
beat = 60 / 104
prog = [(98.0, [196.0, 246.9, 293.7]), (130.8, [261.6, 329.6, 392.0]), (110.0, [220.0, 261.6, 329.6]), (146.8, [220.0, 293.7, 370.0])]
for k in range(int(TOTAL / beat) + 1):
    root, ch = prog[(k // 4) % 4]
    at = k * beat
    place(mus, lp(pluck(root / 2, 0.7, 0.2), 500) * 0.9, at)
    place(mus, pluck(ch[(k * 2) % 3], 0.35) * 0.35, at + beat / 2)
    if k % 2:
        place(mus, pluck(ch[(k + 1) % 3] * 2, 0.25, 0.6) * 0.18, at + beat * 0.75)
mus = mus / (rms(mus) + 1e-9) * SRMS * db(-18)
mus *= db(-3) ** np.clip(duck * 1.3, 0, 1)
mus *= np.clip(t_all / 1.2, 0, 1)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.6, 0, 1)
with wave.open(str(ROOT / "out/lake/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
