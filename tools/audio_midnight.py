"""Sound for "The Midnight School": the 1.25x voice; night crickets, a classroom murmur, morning birds; SFX on cues (chain,
radio, footsteps, door kick, chalk, chairs, bell, pencil scratches); a light score.
    node /tmp/mde.js > out/midnight/events.json; python tools/audio_midnight.py; tools/master.sh out/midnight/premaster.wav public/audio/midnight-mix.mp3"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 39.4
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/midnight/events.json").read_text())
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
x = load(ROOT / "out/midnight/vo.wav")
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






cut = E["cuts"]
def step2(seed):
    n = int(0.08 * SR)
    return (lp(noise(n, seed), 1600) + 0.8 * np.sin(2 * np.pi * 100 * tt(n)) * np.exp(-tt(n) * 45)) * env(n, 0.002, 0.06)
def thud(seed=7, f=70, dur=0.3):
    n = int(dur * SR); return (lp(noise(n, seed), 300) + 0.8 * np.sin(2 * np.pi * f * tt(n))) * np.exp(-tt(n) * 18)
def handbell(dur=1.6):
    n = int(dur * SR); t = tt(n)
    return sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1320, 1), (2790, 0.5), (4310, 0.25)]) * np.exp(-t * 3.2)
def chain(seed=2):
    out = np.zeros(int(0.5 * SR)); 
    for k in range(5):
        c = click(seed + k); i = int((0.05 + 0.08 * k) * SR); out[i:i + len(c)] += c
    return out
def radio(dur, seed=11):
    n = int(dur * SR); t = tt(n)
    ch = bp(noise(n, seed), 700, 2600) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 3.3 * t)))
    return ch * env(n, 0.01, 0.05)
for k, s in enumerate(E["steps"]): S(step2(100 + k), s["t"], 13)
S(chain(), E["closed"] - 0.1, 12)
S(radio(0.9), E["police"] + 0.2, 13)
S(thud(11, 80, 0.3), E["police"], 12)
S(handbell(), E["bell"] - 0.05, 11)
for k in range(3): P("wooden_01.ogg", E["neighbors"] + 0.5 + 0.9 * k, 14)
S(thud(12, 60, 0.5), E["kick"] + 0.0, 5)
P("slam_02.ogg", E["kick"] + 0.12, 8)
for k in range(5): S(click(30 + k), E["chalkDrop"] + 0.2 + 0.18 * k, 14)
S(whoosh(0.5, 300, 1500, 7), E["chalkDrop"] + 0.1, 14)
P("wooden_01.ogg", E["sit"] + 0.2, 12)
P("wooden_01.ogg", E["sitAt"] + 0.1, 11)
for k in range(6): S(scratch(0.12, 40 + k), E["dark"] + 0.1 + 0.5 * k, 15)
S(handbell(2.0), E["now"] + 0.1, 12)
bed = np.zeros(N)
def seg(a, b, x, g): return x / rms(x) * SRMS * db(g) * gate(a, b, 0.08)
bed += seg(cut[0], cut[2], bp(noise(N, 61), 150, 700), -33)
cr = np.zeros(N); rng = np.random.default_rng(5); at = 0.0
while at < cut[3] - 0.1:
    n = int(0.05 * SR); place(cr, np.sin(2 * np.pi * 4300 * tt(n)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * tt(n)))) * env(n, 0.005, 0.01) * SRMS * db(-16), at); at += 0.33 + rng.random() * 0.08
bed += cr * (gate(cut[0], cut[2], 0.05))
bed += seg(cut[2], cut[3], bp(noise(N, 62), 250, 1100) * (0.6 + 0.4 * np.sin(t_all * 2.3)), -33)
bird = np.zeros(N); at = cut[3] + 0.2
while at < TOTAL - 0.4:
    f0 = 2600 + rng.random() * 1800
    for j in range(3): place(bird, chirp(f0, f0 * 1.3, 0.07) * SRMS * db(-17), at + j * 0.11)
    at += 0.9 + rng.random()
bed += bird
def note(f, dur=1.2, bright=0.25):
    n = int(dur * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t)) * np.exp(-t * 3.0) * env(n, 0.003, 0.25)
def phrase(t0, t1, beat, seq, gdb):
    out = np.zeros(N); k = 0
    while t0 + k * beat < t1:
        f = seq[k % len(seq)]
        if f: place(out, lp(note(f), 2600), t0 + k * beat)
        k += 1
    out *= gate(t0, t1, 0.3)
    return out / (rms(out[out != 0]) + 1e-9) * SRMS * db(gdb)
mus = phrase(0.1, cut[3], 0.36, [220.0, 0, 261.6, 0, 329.6, 0, 311.1, 0, 220.0, 0, 246.9, 0, 196.0, 0, 0, 0], -21)
mus += phrase(cut[3], TOTAL, 0.34, [261.6, 329.6, 392.0, 329.6, 293.7, 349.2, 440.0, 349.2], -19)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)
fx *= db(0) ** np.clip(duck * 1.3, 0, 1)
fx *= db(2.5)
bed *= db(9); mus *= db(-8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.4, 0, 1)
with wave.open(str(ROOT / "out/midnight/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s"); print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
