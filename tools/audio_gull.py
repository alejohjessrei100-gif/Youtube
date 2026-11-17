"""Sound for the gull at 9:14 short: the 1.15x voice, a light plucked folk bed that stops when the store is gone, room and
country beds, and story SFX on their words (CC0 one-shots in assets/sfx plus synthesized wind, crickets, birds,
engine and pen scratches). Every cue is leveled against the voice.
    python tools/audio_agloe.py   -> out/audio/premaster.wav, then the two-pass loudnorm in tools/master.sh"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 31.0
N = int(TOTAL * SR)
WORDS = json.loads((ROOT / "out/next/words.json").read_text())


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
x = load(ROOT / "out/next/vo.wav")
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

E = json.loads((ROOT / "out/next/events.json").read_text())
CUTS = E["cuts"] + [TOTAL]

def clunk(seed=1, f=90):
    n = int(0.35 * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 18) + bp(noise(n, seed), 300, 2500) * np.exp(-t * 40) * 0.8)

def hum(dur, f=60, seed=2):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * lp(noise(n, seed), 400)) * env(n, 0.3, 0.3)

def whoom(dur=1.0, seed=3):
    n = int(dur * SR)
    t = tt(n)
    return (lp(noise(n, seed), 500) + np.sin(2 * np.pi * np.cumsum(np.linspace(50, 110, n)) / SR)) * np.sin(np.linspace(0, np.pi, n)) ** 0.7

def gull_call(seed=4, dur=0.42, f0=1700, f1=950):
    n = int(dur * SR)
    t = tt(n)
    f = np.linspace(f0, f1, n) * (1 + 0.04 * np.sin(2 * np.pi * 28 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
    return bp(x + 0.15 * noise(n, seed), 500, 6000) * env(n, 0.02, 0.12) * (0.6 + 0.4 * np.sin(np.pi * t / dur))

def flap(seed, dur=0.12):
    n = int(dur * SR)
    return lp(noise(n, seed), 1100) * np.sin(np.linspace(0, np.pi, n)) ** 2

def tap(seed, f=2400):
    n = int(0.03 * SR)
    return bp(noise(n, seed), f * 0.5, f * 1.6) * env(n, 0.001, 0.02)

def clank(seed):
    n = int(0.18 * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * 420 * t) * 0.4 + np.sin(2 * np.pi * 1130 * t) * 0.25 + bp(noise(n, seed), 800, 4000) * 0.6) * np.exp(-t * 22)

def tick(seed):
    n = int(0.02 * SR)
    return bp(noise(n, seed), 2500, 7000) * env(n, 0.001, 0.015)

def sting(seed=9):
    n = int(0.7 * SR)
    t = tt(n)
    x = sum(np.sin(2 * np.pi * f * t) for f in (311, 466, 622, 740)) / 4
    return x * np.exp(-t * 3.5) + bp(noise(n, seed), 2000, 8000) * np.exp(-t * 20) * 0.6

# -- the lamp: a clunk, then a hum that swells under a soft whoom, each time it comes on
for on in [E["on1"], E["on2"], E["light"]]:
    place(fx, level(clunk(int(on * 10)), 7), on - 0.35)
    place(fx, level(whoom(1.1, int(on * 3)), 9), on - 0.1)
place(fx, level(sting(), 6), E["scare"])
# -- by day: footsteps on the iron deck, screwdriver clicks, "fine", the padlock clacking shut
for k in range(6):
    place(fx, level(tap(10 + k, 1800), 14), E["checks"] - 0.2 + k * 0.17)
P("pluck_001.ogg", E["fine"] + 0.05, 12)
P("metal_03.ogg", E["lock"], 8)
P("wood-small.wav", E["lock"] + 0.08, 12)
# -- night: the watch ticks, a soft swish over the feathers
for k in range(5):
    place(fx, level(tick(30 + k), 13), E["watch"] + k * 0.25)
place(fx, level(whoosh(0.6, 3000, 900, 31), 14), E["feathers"])
# -- the stairs: a clank on every step
n = int((E["climb1"] - E["climb0"]) / 0.3)
for k in range(n):
    place(fx, level(clank(40 + k), 11 + (k % 2) * 2), E["climb0"] + 0.1 + k * 0.3)
# -- 9:13: the pocket watch, wings, the landing, the waddle, three pecks, the lever
for k in range(6):
    place(fx, level(tick(60 + k), 12), E["t913"] + k * 0.25)
for k in range(10):
    place(fx, level(flap(70 + k), 10), E["flapping"] + k * 0.11)
place(fx, level(tap(80, 900), 7), E["lands"])
place(fx, level(gull_call(81, 0.3, 1500, 1200), 13), E["lands"] + 0.35)
place(fx, level(flap(82, 0.2), 11), E["hop"] + 0.05)
for k in range(7):
    place(fx, level(tap(90 + k, 3000), 14), E["hop"] + 0.25 + k * 0.13)
for k, pk in enumerate(E["pecks"]):
    place(fx, level(tap(100 + k, 1400), 6), pk + 0.08)
place(fx, level(clunk(110, 120), 5), E["lever"])
# -- the memory: the switch, the toss, a happy gull
place(fx, level(clunk(120), 7), E["flipped"] + 0.2)
place(fx, level(whoosh(0.4, 600, 2600, 121), 11), E["crust0"])
place(fx, level(gull_call(122, 0.45, 1900, 1100), 8), E["crust1"] + 0.05)
# -- tonight: the glare's foot taps, cloth from the pocket, a rustle, the toss, the happy call
for k in range(4):
    place(fx, level(tap(130 + k, 1600), 11), E["glare"] + 0.1 + k * 0.23)
P("cloth.wav", E["pocket"] + 0.05, 12)
P("paper_01.ogg", E["pocket"] + 0.45, 14)
place(fx, level(whoosh(0.4, 600, 2600, 133), 11), E["bread0"])
place(fx, level(gull_call(134, 0.5, 2000, 1050), 7), E["bread1"] + 0.05)
for c in CUTS[1:-1]:
    place(fx, level(whoosh(0.3, 500, 2800, int(c * 7) % 97), 17), c - 0.12)

# ------------------------------------------------------------------ beds: the sea, wind and far gulls on the point; crickets on the porch; the tower's hollow room tone on the stairs
bed = np.zeros(N)
def gate(a, b, fade=0.12):
    return np.clip((t_all - a) / fade, 0, 1) * np.clip((b - t_all) / fade, 0, 1)
sea = lp(noise(N, 5), 600) * (0.55 + 0.45 * np.sin(2 * np.pi * t_all / 5.5) ** 2)
sea = sea / rms(sea) * SRMS * db(-22)
wind = bp(noise(N, 6), 300, 1800) * (0.6 + 0.4 * np.sin(t_all * 0.8))
wind = wind / rms(wind) * SRMS * db(-27)
on_point = gate(CUTS[0], CUTS[1]) + gate(CUTS[2], CUTS[4]) + gate(CUTS[5], TOTAL)
bed += (sea + wind) * on_point
k = 0
at = 0.5
while at < TOTAL - 0.5:
    if on_point[int(at * SR)] > 0.5:
        place(bed, gull_call(500 + k, 0.35, 1600 + 100 * (k % 3), 1100) * SRMS * db(-16), at)
    k += 1
    at += 2.3 + (k % 3) * 0.7
crick = np.zeros(N)
for k in range(int((CUTS[2] - CUTS[1]) / 0.4)):
    m = int(0.1 * SR)
    c = np.sin(2 * np.pi * 4600 * tt(m)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 30 * tt(m)))) * env(m, 0.01, 0.03)
    place(crick, c, CUTS[1] + 0.1 + k * 0.4)
bed += crick * SRMS * db(-17)
creak_porch = np.zeros(N)
for k in range(3):
    m = int(0.4 * SR)
    place(creak_porch, lp(np.sign(np.sin(2 * np.pi * np.cumsum(np.linspace(240, 170, m)) / SR)) * 0.4 + 0.3 * bp(noise(m, 600 + k), 400, 1200), 1600) * env(m, 0.05, 0.15), CUTS[1] + 0.2 + k * 0.62)
bed += creak_porch / (rms(creak_porch[creak_porch != 0]) + 1e-9) * SRMS * db(-16)
room = lp(noise(N, 7), 250)
room = room / rms(room) * SRMS * db(-24)
bed += room * gate(CUTS[4], CUTS[5])

# ------------------------------------------------------------------ music: a gentle plucked waltz-ish loop in F; a warmer, slower take for the memory
def pluck(f, dur=0.5, bright=0.4):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 6) * env(n, 0.002, 0.05)

def loop(t0, t1, bpm, prog, gain_db, seed=0):
    out = np.zeros(N)
    beat = 60 / bpm
    k = 0
    while t0 + k * beat < t1:
        root, ch = prog[(k // 3) % len(prog)]
        at = t0 + k * beat
        if k % 3 == 0:
            place(out, lp(pluck(root, 0.8, 0.2), 500) * 0.9, at)
        else:
            place(out, pluck(ch[k % 3], 0.4) * 0.35, at)
            place(out, pluck(ch[(k + 1) % 3], 0.4) * 0.25, at + 0.01)
        k += 1
    return out / (rms(out[out != 0]) + 1e-9) * SRMS * db(gain_db)

PROG = [(87.3, [349.2, 440.0, 523.3]), (116.5, [466.2, 587.3, 698.5]), (130.8, [392.0, 523.3, 659.3]), (87.3, [349.2, 440.0, 523.3])]
mus = loop(0, CUTS[6], 132, PROG, -20) * np.clip(t_all / 1.0, 0, 1)
mus *= np.clip((CUTS[6] + 0.05 - t_all) / 0.2, 0, 1)
mem = loop(CUTS[6], CUTS[7], 104, PROG[1:] + PROG[:1], -18) * gate(CUTS[6], CUTS[7], 0.2)
fin = loop(CUTS[7], TOTAL, 132, PROG, -19) * gate(CUTS[7], TOTAL, 0.25)
mus = mus + mem + fin
mus *= db(-3) ** np.clip(duck * 1.3, 0, 1)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
bed *= db(6)
mus *= db(5)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.5, 0, 1)
with wave.open(str(ROOT / "out/next/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
