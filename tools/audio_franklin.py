"""Sound for "He Made His Enemy Like Him With One Favor": the 1.25x voice (pauses kept); beds per place (assembly murmur,
library fire + clock, 1969 lab hum + tape whir, office air + keyboards); SFX on cues (quill scratch, paper, steps, door, book
slide, cup clink, coins, chalk tick, gift shove, pen click); a light pluck score that warms at the end.
    node /tmp/fe.js > out/franklin/events.json (tools/t/franklin_events.ts); python3 tools/audio_franklin.py;
    tools/master.sh out/franklin/premaster.wav public/audio/franklin-mix.mp3"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 36.3
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/franklin/events.json").read_text())
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
x = load(ROOT / "out/franklin/vo.wav")
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
cut = E["cuts"]
def step2(seed, run=False, wood=True):
    n = int(0.08 * SR)
    s = lp(noise(n, seed), 1400 if wood else 2200) + 0.9 * np.sin(2 * np.pi * 110 * tt(n)) * np.exp(-tt(n) * 45)
    return s * env(n, 0.002, 0.06)
def thud(seed=7, f=70, dur=0.3):
    n = int(dur * SR)
    return (lp(noise(n, seed), 300) + 0.8 * np.sin(2 * np.pi * f * tt(n))) * np.exp(-tt(n) * 18)
def clink(f=2600, seed=3):
    n = int(0.5 * SR); t = tt(n)
    return sum(np.sin(2 * np.pi * f * k * t) * a for k, a in [(1, 1), (2.7, 0.4), (5.1, 0.2)]) * np.exp(-t * 9)
def slide(dur, seed=4):
    n = int(dur * SR)
    return bp(noise(n, seed), 600, 3500) * np.sin(np.linspace(0, np.pi, n)) ** 0.7
def scratch_run(dur, seed=6):
    out = np.zeros(int(dur * SR)); at = 0.0; k = 0
    while at < dur - 0.1:
        c = scratch(0.06 + 0.06 * ((k * 7) % 5) / 5, seed + k); i = int(at * SR); out[i:i + len(c)] += c[: max(0, len(out) - i)]; at += 0.09 + 0.05 * ((k * 3) % 4) / 4; k += 1
    return out
for k, s in enumerate(E["steps"]):
    S(step2(100 + k, s["run"]), s["t"], 12 if s["run"] else 14)
# 1 HALL: a gavel-like knock at the start, the jab, quill dip + scratching, paper fold/handoff, the door on the run
S(thud(11, 90, 0.25), 0.05, 12)
S(whoosh(0.3, 500, 2200, 21), E["so"] - 0.15, 16)
S(click(31), E["asked"] + 0.25, 13)
S(scratch_run(E["letter"] + 0.4 - E["specifically"]), E["specifically"] + 0.05, 13)
P("paper_02.ogg", E["handOff"], 12)
S(whoosh(0.5, 300, 1800, 22), E["msRun"], 14)
# 2 LIB: the door bursts open, the letter, the book slides
P("slam_02.ogg", cut[1] + 0.02, 12)
P("paper_01.ogg", E["msIn"] + 0.95, 13)
S(slide(0.32), E["bookSlide"], 11)
S(thud(12, 120, 0.18), E["bookSlide"] + 0.3, 14)
# 3 LIB a week later: door, book down, note, handshake, cups, the "?" and the heart
P("wooden_01.ogg", cut[2] + 0.1, 13)
S(thud(13, 130, 0.15), E["week"] + 0.45, 14)
P("paper_03.ogg", E["noteGive"], 12)
S(thud(14, 160, 0.12), E["shake"] + 0.2, 15)
S(clink(2600), E["clink"], 9)
S(beep(880, 0.08), E["why"] - 0.2, 15)
S(chirp(700, 1400, 0.25), E["must"] - 0.1, 13)
# 4 LAB: coins, the check mark
for k in range(3): S(clink(3800 + 300 * k, 20 + k), E["coins"] + 0.3 + 0.07 * k, 14)
S(chirp(900, 1800, 0.18), E["held"] + 0.05, 12)
# 5 OFFICE: the gift shoved out and back, set down, the pen click, a warm sting
S(slide(0.25, 8), E["giftGo"], 13)
S(slide(0.2, 9), E["giftBack"], 12)
S(thud(15, 100, 0.2), E["giftBack"] + 0.45, 14)
S(click(41), E["pen"], 11)
S(click(42), E["pen"] + 0.12, 13)

# ------------------------------------------------------------------ beds
bed = np.zeros(N)
def seg(a, b, x, gdb):
    return x / rms(x) * SRMS * db(gdb) * gate(a, b, 0.08)
murmur = bp(noise(N, 61), 250, 1100) * (0.6 + 0.4 * np.sin(t_all * 3.1) * np.sin(t_all * 1.7))
bed += seg(cut[0], cut[1], murmur, -27)
fire = lp(noise(N, 62), 900) * (0.5 + 0.5 * (np.random.default_rng(3).random(N) < 0.004))
bed += seg(cut[1], cut[3], fire, -31)
tick = np.zeros(N); at = cut[1] + 0.2
while at < cut[3]:
    n = int(0.02 * SR); place(tick, bp(noise(n, int(at * 10)), 2500, 7000) * env(n, 0.001, 0.015) * SRMS * db(-14), at); at += 0.5
bed += tick
hum = np.sin(2 * np.pi * 120 * t_all) * 0.4 + bp(noise(N, 63), 3000, 8000) * 0.3
bed += seg(cut[3], cut[4], hum, -33)
air = lp(noise(N, 64), 500)
bed += seg(cut[4], TOTAL, air, -30)
keys = np.zeros(N); at = cut[4] + 0.3; k = 0
while at < TOTAL - 0.3:
    c = click(70 + k); place(keys, c * SRMS * db(-20), at); at += 0.12 + 0.25 * ((k * 7) % 5) / 5; k += 1
bed += keys

# ------------------------------------------------------------------ score: harpsichord-ish plucks (1737) -> light modern -> warm
def note(f, dur=0.9, bright=0.45):
    n = int(dur * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.25 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 5.0) * env(n, 0.002, 0.2)
def phrase(t0, t1, beat, seq, gain_db):
    out = np.zeros(N); k = 0
    while t0 + k * beat < t1:
        f = seq[k % len(seq)]
        if f: place(out, lp(note(f), 3200), t0 + k * beat)
        k += 1
    out *= gate(t0, t1, 0.3)
    return out / (rms(out[out != 0]) + 1e-9) * SRMS * db(gain_db)
BAROQUE = [293.7, 349.2, 440.0, 349.2, 293.7, 0, 329.6, 392.0, 466.2, 392.0, 329.6, 0]
TENDER = [261.6, 329.6, 392.0, 329.6, 349.2, 440.0, 523.3, 440.0]
MODERN = [392.0, 0, 493.9, 0, 587.3, 0, 493.9, 0]
mus = phrase(0.1, cut[2], 0.25, BAROQUE, -21)
mus += phrase(cut[2], cut[3], 0.32, TENDER, -20)
mus += phrase(cut[3], TOTAL, 0.28, MODERN, -20)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
fx *= db(0)
bed *= db(7)
mus *= db(-8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.4, 0, 1)
with wave.open(str(ROOT / "out/franklin/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
