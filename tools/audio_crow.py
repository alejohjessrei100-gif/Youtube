"""Sound for the Chess Crow short: the 1.2x voice (pauses kept); park beds (day birds, night crickets, sunrise birds);
story SFX on their cues (CC0 one-shots in assets/sfx plus synthesized steps, clicks, flaps, caws, scrape, sting); a light
plucked score. Leveled like the approved gull/biscuit mix (music far under the voice).
    python tools/audio_crow.py -> out/crow/premaster.wav, then tools/master.sh out/crow/premaster.wav public/audio/crow-mix.mp3"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 37.5
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/crow/events.json").read_text())
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
x = load(ROOT / "out/crow/vo.wav")
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


def clack(seed=1):
    # a wooden piece set down on the stone board: a short bright knock
    n = int(0.07 * SR)
    return (bp(noise(n, seed), 900, 5000) * 0.7 + np.sin(2 * np.pi * 1250 * tt(n)) * 0.6) * np.exp(-tt(n) * 70)


def flap(seed):
    n = int(0.13 * SR)
    return lp(noise(n, seed), 1100) * np.sin(np.linspace(0, np.pi, n)) ** 2


def caw(seed=1, dur=0.32, f0=620):
    n = int(dur * SR)
    t = tt(n)
    f = f0 * (1 + 0.12 * np.sin(np.pi * t / dur)) - 80 * t / dur
    ph = 2 * np.pi * np.cumsum(f) / SR
    buzz = np.sign(np.sin(ph)) * 0.5 + np.sin(2 * ph) * 0.4 + np.sin(3 * ph) * 0.3
    s = bp(buzz + 0.5 * noise(n, seed), 500, 3200)
    return s * np.sin(np.linspace(0, np.pi, n)) ** 0.7


def wahwah(t0):
    # two falling muted-brass notes: "and he's losing"
    out = np.zeros(int(1.3 * SR))
    for k, (f, d) in enumerate([(311.1, 0.42), (277.2, 0.75)]):
        n = int(d * SR)
        t = tt(n)
        fr = f * (1 - 0.06 * t / d) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
        ph = 2 * np.pi * np.cumsum(fr) / SR
        s = sum(np.sin(h * ph) / h for h in range(1, 7))
        s = lp(s, 1500) * env(n, 0.03, 0.15)
        a = int(k * 0.45 * SR)
        out[a:a + n] += s
    return out


T = E
cut = E["cuts"]
# 2. his one move: lift (cloth), the pawn set down; 3. his steps home
P("cloth.wav", E["makes"] + 0.1, 15)
S(clack(2), E["walks"] - 0.33, 9)
for i in range(6):
    S(step(400 + i, hard=False), cut[2] + 0.12 + i * 0.42, 15)
# 4. a soft question pluck as the moved bishop reads
P("pluck_001.ogg", E["black"] + 0.05, 11)
P("pluck_001.ogg", E["always"] + 0.1, 13)
# 5/6. two little "nope" pops
S(chirp(700, 420, 0.16), E["not1"] + 0.05, 12)
S(chirp(760, 460, 0.16), E["not2"] + 0.05, 12)
# 7. wah-wah
S(wahwah(0), E["losing"] - 0.05, 9)
# 8. the flashlight click
S(click(3), E["flashlight"] + 0.08, 9)
# 9. wings, landing, caw, the knight's scrape, the sting and the king's fall
for i in range(9):
    S(flap(600 + i), E["crow"] - 0.25 + i * 0.105, 13)
S(tap(700, soft=False), E["lands"] + 0.35, 11)
S(caw(1), E["board"] + 0.35, 10)
S(scratch(0.5, 9), E["pushes"] + 0.2, 12)
S(sting(), E["checkmate"] + 0.05, 7)
S(clack(5), E["checkmate"] + 0.52, 9)
S(clack(6) * 0.6, E["checkmate"] + 0.62, 12)
# 10. the stool, 11. the king set down, 12. "best of fifty" bell, the smug caw at the score
P("cloth.wav", cut[9] + 0.05, 14)
S(clack(8), cut[11] - 0.3, 9)
P("bell_02.ogg", E["eleven"] - 0.15, 12)
S(caw(4, 0.26, 700), E["four"] + 0.45, 11)
S(caw(5, 0.22, 760), E["four"] + 0.8, 12)

# ------------------------------------------------------------------ beds: day birds and air; night crickets; sunrise birds
bed = np.zeros(N)
air = lp(noise(N, 41), 900) * (0.7 + 0.3 * np.sin(t_all * 0.6))
air = air / rms(air) * SRMS * db(-31)
bed += air
NIGHT = (cut[7], cut[8])
rng = np.random.default_rng(5)
at = 0.2
while at < TOTAL - 0.5:
    if not (NIGHT[0] <= at < NIGHT[1]):
        f0 = 2600 + rng.random() * 1800
        place(bed, (np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f0 * 1.25, int(0.08 * SR))) / SR) * np.sin(np.linspace(0, np.pi, int(0.08 * SR))) ** 2) * SRMS * db(-12), at)
        place(bed, (np.sin(2 * np.pi * np.cumsum(np.linspace(f0 * 1.2, f0, int(0.07 * SR))) / SR) * np.sin(np.linspace(0, np.pi, int(0.07 * SR))) ** 2) * SRMS * db(-14), at + 0.11)
    at += 0.6 + rng.random() * 1.1
cr = np.zeros(N)
at = NIGHT[0]
while at < NIGHT[1]:
    n = int(0.05 * SR)
    place(cr, np.sin(2 * np.pi * 4300 * tt(n)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * tt(n)))) * env(n, 0.005, 0.01) * SRMS * db(-14), at)
    at += 0.33 + rng.random() * 0.08
bed += cr * gate(NIGHT[0], NIGHT[1])


# ------------------------------------------------------------------ score: light plucked notes; sneaky at night; a bright tag at the end
def note(f, dur=0.9, bright=0.35):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 5.5) * env(n, 0.003, 0.2)


def phrase(t0, t1, beat, seq, gain_db):
    out = np.zeros(N)
    k = 0
    while t0 + k * beat < t1:
        f = seq[k % len(seq)]
        if f:
            place(out, lp(note(f), 2600), t0 + k * beat)
        k += 1
    out *= gate(t0, t1, 0.3)
    return out / (rms(out[out != 0]) + 1e-9) * SRMS * db(gain_db)


CURIOUS = [293.7, 0, 349.2, 0, 440.0, 392.0, 349.2, 0, 293.7, 0, 329.6, 0, 261.6, 293.7, 0, 0]
SNEAK = [146.8, 0, 0, 155.6, 146.8, 0, 0, 0, 130.8, 0, 0, 138.6, 130.8, 0, 0, 0]
TENSE = [293.7, 311.1, 293.7, 311.1, 329.6, 349.2, 329.6, 349.2]
TAG = [392.0, 493.9, 587.3, 784.0, 587.3, 493.9, 392.0, 0]
mus = phrase(0.2, cut[6], 0.25, CURIOUS, -20)
mus += phrase(cut[6], cut[8], 0.25, SNEAK, -19)
mus += phrase(cut[8], E["checkmate"], 0.3, TENSE, -21)
mus += phrase(cut[9], TOTAL, 0.22, TAG, -20)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
bed *= db(4)
mus *= db(-8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.5, 0, 1)
with wave.open(str(ROOT / "out/crow/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
