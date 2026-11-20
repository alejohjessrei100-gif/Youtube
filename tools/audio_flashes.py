"""Sound for "Three Flashes": the 1.25x voice; a night parking lot (city hum, crickets, a far siren), a 1974 porch (crickets,
a distant dog); SFX on cues (flashlight clicks, footsteps, radio, the grab, the flashlight clatter and roll, porch switch,
phone ticks, a chorus of clicks); a soft piano score, mystery then warm.
    node /tmp/fe.js > out/flashes/events.json; python tools/audio_flashes.py; tools/master.sh out/flashes/premaster.wav public/audio/flashes-mix.mp3"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 37.0
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/flashes/events.json").read_text())
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
x = load(ROOT / "out/flashes/vo.wav")
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
def scuff(seed):
    n = int(0.12 * SR)
    return lp(noise(n, seed), 900) * env(n, 0.01, 0.08)
def tclick(seed=1, f=1800):
    n = int(0.025 * SR)
    return (bp(noise(n, seed), 2000, 7000) * 0.7 + np.sin(2 * np.pi * f * tt(n))) * env(n, 0.0005, 0.018)
def radio(dur, seed=11):
    n = int(dur * SR); t = tt(n)
    ch = bp(noise(n, seed), 700, 2600) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 3.3 * t)))
    return ch * env(n, 0.01, 0.05)
def clank(seed=3):
    n = int(0.4 * SR); t = tt(n)
    s = sum(np.sin(2 * np.pi * f * t) * a * np.exp(-t * d) for f, a, d in [(1730, 1, 14), (2650, 0.6, 18), (4120, 0.4, 25), (950, 0.5, 10)])
    return (s + bp(noise(n, seed), 2000, 8000) * np.exp(-t * 40)) * env(n, 0.0005, 0.1)
def rattle(dur=0.85, seed=9):
    n = int(dur * SR); t = tt(n)
    r = (np.random.default_rng(seed).random(n) < 0.004).astype(float)
    return (bp(lp(r, 6000) * 6, 1500, 6000) + 0.3 * bp(noise(n, seed), 400, 2000)) * np.linspace(1, 0.2, n) * env(n, 0.01, 0.1)
def chime(f, dur=1.1):
    n = int(dur * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 3.5) * env(n, 0.002, 0.2)
# footsteps: Tom (slippers: soft scuffs), the guard (hard), the nurses (soft)
for k, s in enumerate(E["steps"]):
    soft = (s["s"] in (1, 2) and s["i"] == 0) or s["s"] == 5 and s["i"] >= 2
    S(scuff(100 + k) if soft else step2(100 + k), s["t"], 15 if soft else 13)
# scene 1: the flashlight on, three flash clicks, off; the radio
S(tclick(1), E["flashlight"] - 0.3, 12)
S(tclick(2), E["three"] - 0.27, 13)
for k, a in enumerate(E["flash1"]): S(tclick(10 + k), a, 11); S(tclick(20 + k, 1500), a + 0.2, 13)
S(radio(0.5, 3), E["security"] + 0.4, 14)
S(radio(0.95, 4), E["planning"] - 0.05, 13)
S(beep(1400, 0.08), E["planning"] + 0.95, 15)
# scene 2: flashes, the grab, the clatter + roll, a sting for the reveal
for k, a in enumerate(E["flash2"]): S(tclick(30 + k), a, 11); S(tclick(40 + k, 1500), a + 0.2, 13)
S(tclick(45), E["so"] + 1.0, 13)
P("cloth.wav", E["grabbed"] - 0.05, 9)
S(whoosh(0.25, 500, 2400, 3), E["grabbed"] - 0.1, 13)
S(clank(5), E["drop"] + 0.36, 6)
S(clank(6) * 0.6, E["drop"] + 0.47, 10)
S(rattle(0.85, 7), E["drop"] + 0.52, 11)
S(sting() * 0.8, E["tom"] - 0.05, 12)
P("swing2.wav", E["you"] + 0.3, 16)
# scene 3: the porch switch, crickets, a far dog
for k, a in enumerate(E["porch"]): S(tclick(60 + k, 900), a, 10); S(tclick(70 + k, 800), a + 0.2, 12)
# scene 4: the climb, the phone blinks answered by chimes
S(whoosh(1.6, 200, 1400, 9), E["looked"] + 0.1, 15)
for k, a in enumerate(E["phone"]): S(chime([784.0, 987.8, 1174.7][k], 1.0), a, 12)
# scene 5: the guard's click, the nurses arrive, a chorus of clicks with the whole floor
S(tclick(80), E["own"] + 0.0, 10)
for k in range(14):
    for j, d in enumerate([0, 0.36, 0.72]): S(tclick(90 + k * 3 + j, 1500 + 80 * k), E["blinked2"] - 0.25 + d + 0.05 * ((k * 7) % 5), 17)
for k, f in enumerate([523.3, 659.3, 784.0]): S(chime(f, 1.6), E["blinked2"] + 0.4 + 0.12 * k, 11)
bed = np.zeros(N)
def seg(a, b, x, g): return x / rms(x) * SRMS * db(g) * gate(a, b, 0.08)
LOT_SPANS = [(cut[0], cut[2]), (cut[3], TOTAL)]
for a, b in LOT_SPANS: bed += seg(a, b, lp(noise(N, 61), 220) + 0.4 * bp(noise(N, 63), 60, 120), -31)
cr = np.zeros(N); rng = np.random.default_rng(5); at = 0.0
while at < TOTAL - 0.1:
    n = int(0.05 * SR); place(cr, np.sin(2 * np.pi * 4300 * tt(n)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * tt(n)))) * env(n, 0.005, 0.01) * SRMS * db(-18), at); at += 0.33 + rng.random() * 0.08
bed += cr
siren = np.sin(2 * np.pi * np.cumsum(700 + 180 * np.sin(2 * np.pi * 0.45 * t_all)) / SR)
bed += bp(siren, 500, 1200) * SRMS * db(-30) * gate(1.0, 8.5, 2.0)
dog = np.zeros(N)
for k in range(2):
    n = int(0.16 * SR); place(dog, bp(noise(n, 70 + k), 300, 1100) * env(n, 0.01, 0.1) * SRMS * db(-20), cut[2] + 0.9 + 1.1 * k)
bed += dog
bed += seg(cut[2], cut[3], bp(noise(N, 64), 200, 900) * (0.7 + 0.3 * np.sin(t_all * 1.7)), -36)
def note(f, dur=1.4, bright=0.25):
    n = int(dur * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t)) * np.exp(-t * 2.6) * env(n, 0.003, 0.3)
def phrase(t0, t1, beat, seq, gdb):
    out = np.zeros(N); k = 0
    while t0 + k * beat < t1:
        f = seq[k % len(seq)]
        if f: place(out, lp(note(f), 2600), t0 + k * beat)
        k += 1
    out *= gate(t0, t1, 0.3)
    return out / (rms(out[out != 0]) + 1e-9) * SRMS * db(gdb)
mus = phrase(0.1, cut[2], 0.4, [220.0, 0, 261.6, 0, 246.9, 0, 196.0, 0, 220.0, 0, 293.7, 0, 261.6, 0, 0, 0], -21)
mus += phrase(cut[2], cut[3], 0.38, [392.0, 329.6, 261.6, 329.6, 349.2, 293.7, 246.9, 293.7], -19)
mus += phrase(cut[3], TOTAL, 0.38, [261.6, 329.6, 392.0, 523.3, 349.2, 440.0, 523.3, 440.0], -19)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)
fx *= db(0) ** np.clip(duck * 1.3, 0, 1)
fx *= db(-3.5)
bed *= db(9); mus *= db(-9.8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.4, 0, 1)
with wave.open(str(ROOT / "out/flashes/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s"); print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
