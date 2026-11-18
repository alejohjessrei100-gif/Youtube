"""Sound for the Graves short: the 1.15x voice (pauses kept); beds (surf and wind on the headland, night crickets, the
1931 storm with rain); story SFX (gulls, the bell, newspaper, the truck engine and gravel, a door, the stone); a sparse
sad felt-piano. Leveled like the approved gull/biscuit/crow mix (music far under the voice).
    python tools/audio_graves.py -> out/graves/premaster.wav, then tools/master.sh out/graves/premaster.wav public/audio/graves-mix.mp3"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 39.8
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/graves/events.json").read_text())
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
x = load(ROOT / "out/graves/vo.wav")
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


def gull(seed):
    n = int(0.42 * SR)
    t = tt(n)
    f = 1500 + 700 * np.sin(np.pi * t / 0.42) - 500 * t
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.sin(np.linspace(0, np.pi, n)) ** 1.5 * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))


def thunder(seed):
    n = int(2.4 * SR)
    return lp(noise(n, seed), 160, 3) * np.exp(-tt(n) * 1.6) * (0.4 + 0.6 * np.random.default_rng(seed).random(n) ** 8 * 0 + 0.6)


def engine(dur, seed=3):
    n = int(dur * SR)
    t = tt(n)
    f = 38 + 6 * np.sin(2 * np.pi * 0.7 * t)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + 0.5 * lp(noise(n, seed), 300)
    return lp(s, 500) * env(n, 0.3, 0.6)


def gravel(dur, seed=5):
    n = int(dur * SR)
    return bp(noise(n, seed), 1500, 6000) * (0.4 + 0.6 * (np.random.default_rng(seed).random(n) < 0.03)) * env(n, 0.2, 0.4)


def thud(seed=7):
    n = int(0.3 * SR)
    return (lp(noise(n, seed), 250) + 0.8 * np.sin(2 * np.pi * 70 * tt(n))) * np.exp(-tt(n) * 18)


cut = E["cuts"]
# 1-5: gulls by day, a distant bell, a stone tap as the names pass, the laugh beat
for k, at in enumerate([0.4, 1.9, 5.0, 9.8, 12.9]):
    S(gull(10 + k), at, 15 + (k % 2) * 2)
P("bell_01.ogg", 0.15, 12)
for k, at in enumerate([E["thomas"], E["ellis"], E["jonah"]]):
    S(tap(30 + k, soft=False), at + 0.05, 14)
# 6/7: notebook page, newspaper rustle
P("paper_02.ogg", cut[5] + 0.4, 12)
P("paper_01.ogg", cut[6] + 0.02, 9)
P("paper_03.ogg", cut[6] + 1.8, 13)
# 8: the storm: thunder, creaks, the boat going down
S(thunder(41), cut[7] + 0.1, 8)
P("wooden_01.ogg", E["sank"] + 0.1, 11)
S(thunder(42), E["sank"] + 0.9, 9)
P("splash_01.ogg", E["sank"] + 1.4, 10)
# 9-11: a gate creak at night, the truck engine and gravel, brakes, the door
P("metal_05.ogg", cut[9] + 0.3, 15)
S(engine(E["drive"][1] - E["drive"][0] + 1.6), E["drive"][0] - 0.3, 10)
S(gravel(E["drive"][1] - E["drive"][0]), E["drive"][0], 14)
P("slam_02.ogg", cut[11] + 0.15, 12)
S(thud(), E["captain"] - 0.5, 13)
# 13: dawn gulls
S(gull(20), cut[12] + 0.4, 15)
S(gull(21), cut[12] + 2.1, 17)

# ------------------------------------------------------------------ beds: surf and wind; crickets at night; storm + rain
bed = np.zeros(N)
surf = lp(noise(N, 51), 700) * (0.55 + 0.45 * np.sin(t_all * 0.5) ** 2)
surf = surf / rms(surf) * SRMS * db(-27)
wind = bp(noise(N, 52), 250, 1400) * (0.7 + 0.3 * np.sin(t_all * 0.31))
wind = wind / rms(wind) * SRMS * db(-31)
bed += surf + wind
STORM = (cut[7], cut[8])
rain = bp(noise(N, 53), 1800, 9000)
rain = rain / rms(rain) * SRMS * db(-20)
bed += rain * gate(STORM[0], STORM[1], 0.06)
rng = np.random.default_rng(5)
cr = np.zeros(N)
for a, b in [(cut[1], cut[2]), (cut[9], cut[12])]:
    at = a
    while at < b:
        n = int(0.05 * SR)
        place(cr, np.sin(2 * np.pi * 4300 * tt(n)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * tt(n)))) * env(n, 0.005, 0.01) * SRMS * db(-15), at)
        at += 0.33 + rng.random() * 0.08
bed += cr


# ------------------------------------------------------------------ score: a sparse felt piano, a minor ostinato that warms at dawn
def note(f, dur=1.6, bright=0.2):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.06 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 2.2) * env(n, 0.004, 0.3)


def phrase(t0, t1, beat, seq, gain_db):
    out = np.zeros(N)
    k = 0
    while t0 + k * beat < t1:
        f = seq[k % len(seq)]
        if f:
            place(out, lp(note(f), 2200), t0 + k * beat)
        k += 1
    out *= gate(t0, t1, 0.4)
    return out / (rms(out[out != 0]) + 1e-9) * SRMS * db(gain_db)


MYSTERY = [220.0, 0, 261.6, 0, 329.6, 0, 311.1, 0, 220.0, 0, 246.9, 0, 196.0, 0, 0, 0]
GRIEF = [196.0, 233.1, 293.7, 233.1, 174.6, 220.0, 261.6, 220.0]
DAWN = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6]
mus = phrase(0.2, cut[6], 0.42, MYSTERY, -21)
mus += phrase(cut[6], cut[12], 0.5, GRIEF, -20)
mus += phrase(cut[12], TOTAL, 0.45, DAWN, -19)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
bed *= db(2)
mus *= db(-8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.6, 0, 1)
with wave.open(str(ROOT / "out/graves/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
