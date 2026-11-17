"""(toolkit shared with the museum mix) Sound for the Biscuit short ("The Man Who Steals Nothing"): the 1.10x voice; beds per place (the night gallery's
hollow room tone, the office's CRT hum, CCTV hiss, the sunny attic, rain on the lobby glass); story SFX on their cues
(CC0 one-shots in assets/sfx plus synthesized alarm, clicks, marker, steps, rip, whooshes); a soft piano-like score:
a tiptoeing mystery, a warm memory, a sad lobby, a gentle resolve. Leveled like the approved gull mix (music far under
the voice).
    python tools/audio_museum.py -> out/biscuit/premaster.wav, then tools/master.sh"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 39.6
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/biscuit/events.json").read_text())
CUTS = E["cuts"] + [TOTAL]


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
x = load(ROOT / "out/biscuit/vo.wav")
v[: min(N, len(x))] = x[:N]
v = v / np.abs(v).max() * 0.7
VPEAK = np.abs(v).max()
SRMS = rms(v[np.abs(v) > 0.02])
duck = lp(np.abs(v), 3, 1)
duck /= duck.max() + 1e-9
t_all = tt(N)


def level(clip, under=8.0):
    c = clip / (np.abs(clip).max() + 1e-9) * VPEAK * db(-(under - 5))
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
def S(clip, at, under=8.0): place(fx, level(clip, under), at)


def gate(a, b, fade=0.12):
    return np.clip((t_all - a) / fade, 0, 1) * np.clip((b - t_all) / fade, 0, 1)


# synthesized one-shots
def click(seed=1):
    n = int(0.03 * SR)
    return (bp(noise(n, seed), 1500, 6000) + 0.6 * np.sin(2 * np.pi * 900 * tt(n))) * env(n, 0.001, 0.02)


def step(seed, hard=True):
    n = int(0.09 * SR)
    s = lp(noise(n, seed), 1800 if hard else 900) + 0.8 * np.sin(2 * np.pi * 95 * tt(n)) * np.exp(-tt(n) * 40)
    return s * env(n, 0.002, 0.07)


def scratch(dur=0.18, seed=1):
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
        out[k * seg:(k + 1) * seg] = bp(nz, f * 0.6, f * 1.4)[k * seg:(k + 1) * seg]
    return out * np.sin(np.linspace(0, np.pi, n)) ** 1.5


def rip(dur=0.35, seed=8):
    n = int(dur * SR)
    s = bp(noise(n, seed), 800, 6000)
    crackle = (np.random.default_rng(seed).random(n) < 0.02).astype(float)
    return (s * 0.6 + lp(crackle, 4000) * 4) * env(n, 0.005, 0.08)


def beep(f=1000, dur=0.12):
    n = int(dur * SR)
    return np.sin(2 * np.pi * f * tt(n)) * env(n, 0.003, 0.03)


def sting():
    n = int(1.2 * SR)
    t = tt(n)
    s = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(55, 1.0), (82.4, 0.6), (116.5, 0.5), (164.8, 0.35)])
    return (s * np.exp(-t * 2.2) + 0.5 * lp(noise(n, 3), 400) * np.exp(-t * 6)) * env(n, 0.004, 0.2)


def jingle(seed=4):
    n = int(0.45 * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(seed)
    for k in range(6):
        f = 2400 + rng.random() * 2600
        at = int(rng.random() * 0.25 * SR)
        m = n - at
        out[at:] += np.sin(2 * np.pi * f * tt(m)) * np.exp(-tt(m) * 18) * (0.5 + rng.random() * 0.5)
    return out


def chirp(f0, f1, dur):
    n = int(dur * SR)
    f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** 2



# ------------------------------------------------------------------ cues
def tap(seed, soft=True):
    n = int(0.05 * SR)
    return lp(noise(n, seed), 1400 if soft else 2600) * env(n, 0.001, 0.04)


def tag_jingle(seed):
    n = int(0.12 * SR)
    f = 3900 + 400 * (seed % 3)
    return (np.sin(2 * np.pi * f * tt(n)) + 0.6 * np.sin(2 * np.pi * f * 1.5 * tt(n))) * np.exp(-tt(n) * 30)


def boing():
    n = int(0.45 * SR)
    f = 220 + 160 * np.exp(-tt(n) * 6) * np.cos(2 * np.pi * 9 * tt(n))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt(n) * 5)


def whimper():
    n = int(0.5 * SR)
    f = np.linspace(900, 620, n) + 40 * np.sin(2 * np.pi * 7 * tt(n))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** 2


def woof():
    n = int(0.22 * SR)
    f = np.linspace(520, 300, n)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.6 * bp(noise(n, 31), 300, 1500)
    return s * env(n, 0.01, 0.12)


def dtmf(k):
    n = int(0.11 * SR)
    lo = [697, 770, 852, 941][k % 4]
    hi = [1209, 1336, 1477][k % 3]
    return (np.sin(2 * np.pi * lo * tt(n)) + np.sin(2 * np.pi * hi * tt(n))) * env(n, 0.005, 0.02)


def ring():
    n = int(0.9 * SR)
    s = np.sin(2 * np.pi * 440 * tt(n)) + np.sin(2 * np.pi * 480 * tt(n))
    return s * env(n, 0.02, 0.05) * 0.5


def pop(seed=1):
    n = int(0.08 * SR)
    f = np.linspace(500, 1400, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt(n) * 30)


# A. the morning street: paper rustles as neighbors pull posters off gates, a screen door, dial tones and a ring
P("paper_01.ogg", E["posters"] + 0.25, 9)
P("paper_02.ogg", E["named"] + 0.1, 10)
P("wooden_01.ogg", E["morning"] + 0.6, 13)
P("cloth.wav", E["nobody"] + 0.15, 11)
for k in range(5):
    S(dtmf(k + 2), E["called"] + 0.05 + k * 0.12, 13)
S(ring(), E["number."] if "number." in E else E["called"] + 0.75, 14)
# B. the overhead: a soft pop for each new morning's posters, ticks as the loop draws
for d in range(1, 5):
    S(pop(d), E["every"] + (E["always"] - E["every"]) * d / 4 - 0.1, 12)
for k in range(10):
    S(tick := (lp(noise(int(0.02 * SR), 70 + k), 5000) * env(int(0.02 * SR), 0.001, 0.015)), E["always"] + k * 0.11, 15)
# C. the carrier's steps and mail, Biscuit's paws and collar tag, the bonk, the whimper, pats, the trot, a happy woof
for seg in E["carrier"]:
    n = max(2, int((seg["t1"] - seg["t0"]) / 0.34))
    for i in range(n):
        S(step(200 + i), seg["t0"] + (seg["t1"] - seg["t0"]) * (i + 0.5) / n, 14)
P("paper_03.ogg", E["then"] + 0.3, 13)
for j, seg in enumerate(E["dogRoute"]):
    dur = seg["t1"] - seg["t0"]
    gap = 0.2 if j == len(E["dogRoute"]) - 1 else 0.3
    n = max(2, int(dur / gap))
    for i in range(n):
        at = seg["t0"] + dur * (i + 0.5) / n
        S(tap(300 + j * 50 + i), at, 18)
        if i % 2 == 0:
            S(tag_jingle(i), at + 0.02, 19)
P("metal_01.ogg", E["bump"], 7)
S(boing(), E["bump"] + 0.05, 10)
S(whimper(), E["bump"] + 0.55, 13)
P("cloth.wav", E["bump"] + 0.5, 13)
for k in range(3):
    S(tap(500 + k, soft=True), E["lost"] + 0.4 + k * 0.32, 12)
S(woof(), E["home"] - 0.15, 9)
S(woof() * 0.8, E["home"] + 0.1, 11)
P("bell_02.ogg", E["hi"] - 0.1, 13)

# ------------------------------------------------------------------ beds: morning birds and a quiet neighborhood; the overhead a soft wind
bed = np.zeros(N)
air = lp(noise(N, 41), 900) * (0.7 + 0.3 * np.sin(t_all * 0.6))
air = air / rms(air) * SRMS * db(-31)
bed += air
rng = np.random.default_rng(5)
at = 0.2
while at < TOTAL - 0.5:
    if not (CUTS[1] <= at < CUTS[2]):
        f0 = 2600 + rng.random() * 1800
        place(bed, (np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f0 * 1.25, int(0.08 * SR))) / SR) * np.sin(np.linspace(0, np.pi, int(0.08 * SR))) ** 2) * SRMS * db(-12), at)
        place(bed, (np.sin(2 * np.pi * np.cumsum(np.linspace(f0 * 1.2, f0, int(0.07 * SR))) / SR) * np.sin(np.linspace(0, np.pi, int(0.07 * SR))) ** 2) * SRMS * db(-14), at + 0.11)
    at += 0.6 + rng.random() * 1.1
wind = bp(noise(N, 42), 200, 1200)
wind = wind / rms(wind) * SRMS * db(-24)
bed += wind * gate(CUTS[1], CUTS[2])


# ------------------------------------------------------------------ score: a gentle felt-piano waltz, warmer at the end
def note(f, dur=1.4, bright=0.22):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.07 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 2.6) * env(n, 0.004, 0.25)


def phrase(t0, t1, beat, seq, gain_db):
    out = np.zeros(N)
    k = 0
    while t0 + k * beat < t1:
        f = seq[k % len(seq)]
        if f:
            place(out, lp(note(f), 2400), t0 + k * beat)
        k += 1
    out *= gate(t0, t1, 0.3)
    return out / (rms(out[out != 0]) + 1e-9) * SRMS * db(gain_db)


CURIOUS = [196.0, 293.7, 392.0, 0, 246.9, 293.7, 220.0, 329.6, 440.0, 0, 261.6, 329.6]
MAP = [392.0, 0, 440.0, 0, 493.9, 0, 587.3, 0]
TENDER = [261.6, 329.6, 392.0, 329.6, 293.7, 349.2, 440.0, 349.2, 246.9, 293.7, 392.0, 293.7]
HOME = [261.6, 392.0, 523.3, 659.3, 523.3, 392.0]
mus = phrase(0.3, CUTS[1], 0.4, CURIOUS, -20)
mus += phrase(CUTS[1], CUTS[2], 0.28, MAP, -20)
mus += phrase(CUTS[2], E["walk"], 0.42, TENDER, -19)
mus += phrase(E["walk"], TOTAL, 0.34, HOME, -18)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
bed *= db(4)
fx *= db(-0.5)  # this film's cues are many small paw taps: brought up to the approved effects level
mus *= db(-8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.5, 0, 1)
with wave.open(str(ROOT / "out/biscuit/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
