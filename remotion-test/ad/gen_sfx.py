"""Synthesised sound effects for the black-and-white ad, placed on the frame of each animation.
Writes public/sfx.wav (stereo, 44.1 kHz, 33.8 s). Run from remotion-test/:  python3 ad/gen_sfx.py
"""
import wave
import numpy as np

SR = 44100
DUR = 33.8
N = int(SR * DUR)
rng = np.random.default_rng(11)
L = np.zeros(N)
R = np.zeros(N)
FPS = 30


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= N:
        return
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - max(0, pan))
    R[i:j] += s * (1 + min(0, pan))


def env(n, a=0.004, d=8.0):
    x = np.arange(n) / SR
    e = np.exp(-x * d)
    att = np.minimum(1, x / a)
    return e * att


def tone(f, dur, decay=9.0, harm=(1.0,), a=0.003):
    n = int(dur * SR)
    x = np.arange(n) / SR
    s = sum(h * np.sin(2 * np.pi * f * (k + 1) * x) for k, h in enumerate(harm))
    return s * env(n, a, decay)


def sweep(f0, f1, dur, shape=1.0, vol_env="bell"):
    n = int(dur * SR)
    x = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** (x ** shape)
    ph = 2 * np.pi * np.cumsum(f) / SR
    e = np.sin(np.pi * x) ** 2 if vol_env == "bell" else np.minimum(1, x * 12) * (1 - x) ** 1.5
    return np.sin(ph) * e


def lowpass_noise(n, c0, c1):
    """noise through a one-pole low-pass whose cutoff glides c0 -> c1"""
    w = rng.standard_normal(n)
    y = np.zeros(n)
    for i in range(1, n):
        c = c0 + (c1 - c0) * (i / n)
        a = 1 - np.exp(-2 * np.pi * c / SR)
        y[i] = y[i - 1] + a * (w[i] - y[i - 1])
    return y / (np.abs(y).max() + 1e-9)


def whoosh(dur=0.5, c0=300, c1=4200, up=True):
    n = int(dur * SR)
    y = lowpass_noise(n, c0, c1) if up else lowpass_noise(n, c1, c0)
    x = np.linspace(0, 1, n)
    return y * np.sin(np.pi * x) ** 2


def click(f=2500, dur=0.03, decay=140):
    n = int(dur * SR)
    w = rng.standard_normal(n)
    w = np.diff(w, prepend=0)  # high-passed
    return w * env(n, 0.0005, decay) * 0.6 + tone(f, dur, decay) * 0.4


def pop(f, dur=0.09, decay=38):
    n = int(dur * SR)
    x = np.arange(n) / SR
    fr = f * (1 + 0.5 * np.exp(-x * 60))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.002, decay)


def ding(f, dur=0.9, decay=5.0):
    a = tone(f, dur, decay, harm=(1.0, 0.0, 0.35, 0, 0.12))
    b = 0.5 * tone(f * 2.4, dur * 0.6, decay * 1.6)
    a[: len(b)] += b
    return a


def swish(dur=0.16, up=False):
    return whoosh(dur, 900 if up else 7000, 7000 if up else 900, up) * 0.8


f2s = lambda f: f / FPS

# ---- scene starts (frames) — same boundaries as AdBW.tsx
HOOK, INTRO, DEMO, HOW, NO, PRICE, CTA = 0, 99, 219, 361, 612, 721, 877

# transitions: soft air whoosh just before each cut
for st, g in [(INTRO, 0.30), (DEMO, 0.28), (HOW, 0.28), (NO, 0.30), (PRICE, 0.30), (CTA, 0.30)]:
    add(whoosh(0.5, 400, 4500), f2s(st) - 0.22, g)

# ---- hook: coin draws, "$" lands, three ripples
add(sweep(320, 1500, 0.75, 1.4), f2s(HOOK), 0.16)
add(ding(2637, 0.7, 7), f2s(HOOK + 22), 0.22)
add(ding(3951, 0.5, 9), f2s(HOOK + 23), 0.10)
add(whoosh(0.7, 500, 1800), f2s(HOOK + 36), 0.10)  # spin
for i, at in enumerate((40, 56, 72)):
    add(tone([880, 784, 698][i], 0.5, 7.0, harm=(1.0, 0.25)), f2s(HOOK + at), 0.20)

# ---- intro: nine phones pop in (rising pentatonic), then focus + fill
notes = [523, 587, 659, 784, 880, 988, 1047, 1175, 1319]
for i, f in enumerate(notes):
    add(pop(f, 0.10, 32), f2s(INTRO + 14 + i * 4 + 4), 0.18, pan=(-0.4 + 0.1 * i) * 0.8)
add(sweep(300, 1400, 0.45, 1.3), f2s(INTRO + 70), 0.14)
add(ding(1568, 0.6, 7), f2s(INTRO + 88), 0.22)

# ---- demo: gentle pop as the phone frame lands
add(pop(330, 0.18, 18), f2s(DEMO + 6), 0.25)

# ---- how: keystrokes while the idea types, then card draws + locks
n_chars = 34
for i in range(1, n_chars + 1):
    f = HOW + 10 + 1.4 * i
    add(click(2200 + rng.integers(-300, 400), 0.03, 150), f2s(f), 0.10 + 0.04 * rng.random(), pan=rng.uniform(-0.2, 0.2))
words = [68, 100, 130, 162, 181, 226]
for k, w in enumerate(words):
    add(sweep(500, 1500, 0.28, 1.2), f2s(HOW + w - 10), 0.10)
    add(click(1100, 0.05, 70), f2s(HOW + w + 8), 0.24)
    add(pop(660 + k * 55, 0.08, 40), f2s(HOW + w + 8), 0.12)
add(whoosh(0.4, 600, 3500), f2s(HOW + 226 + 6), 0.10)
add(ding(1175, 1.0, 4.0), f2s(HOW + 226 + 20), 0.26)

# ---- no: text pops + a swish for each strike-through
for at, st in [(1, 15), (42, 56), (72, 86)]:
    add(pop(420, 0.10, 30), f2s(NO + at), 0.16)
    add(swish(0.16), f2s(NO + st), 0.26)

# ---- price: title pop, underline swish, "$2" coin + ripple, "₱100" pop
add(pop(500, 0.12, 26), f2s(PRICE + 15), 0.20)
add(sweep(400, 1700, 0.9, 1.2), f2s(PRICE + 22), 0.10)
add(ding(1319, 0.8, 6), f2s(PRICE + 80), 0.26)
add(ding(1976, 0.9, 6), f2s(PRICE + 83), 0.22)
add(whoosh(0.7, 700, 2600), f2s(PRICE + 80), 0.12)
add(pop(440, 0.12, 26), f2s(PRICE + 106), 0.16)

# ---- cta: button outline draws, fill whoosh, final chime
add(sweep(300, 1500, 0.95, 1.2), f2s(CTA + 36), 0.12)
add(whoosh(0.5, 500, 3800), f2s(CTA + 62), 0.12)
add(ding(1568, 1.2, 4.0), f2s(CTA + 82), 0.28)
add(ding(3136, 0.9, 6.0), f2s(CTA + 83), 0.12)
add(click(1800, 0.04, 90), f2s(CTA + 88), 0.10)

out = np.stack([L, R], 1)
out = np.tanh(out * 1.2)
out *= 0.9 / np.abs(out).max()
pcm = (out * 32767).astype(np.int16)
with wave.open("public/sfx.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("sfx ok", round(20 * np.log10(np.abs(out).max()), 1), "dBFS peak")
