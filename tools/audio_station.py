"""Sound for "Point at One Person": (adapted from Three Flashes) the 1.25x voice; a night parking lot (city hum, crickets, a far siren), a 1974 porch (crickets,
a distant dog); SFX on cues (flashlight clicks, footsteps, radio, the grab, the flashlight clatter and roll, porch switch,
phone ticks, a chorus of clicks); a soft piano score, mystery then warm.
    node /tmp/fe.js > out/station/events.json; python tools/audio_flashes.py; tools/master.sh out/flashes/premaster.wav public/audio/flashes-mix.mp3"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 37.6
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/station/events.json").read_text())
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
x = load(ROOT / "out/station/vo.wav")
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
def step2(seed, f=1600):
    n = int(0.08 * SR)
    return (lp(noise(n, seed), f) + 0.8 * np.sin(2 * np.pi * 100 * tt(n)) * np.exp(-tt(n) * 45)) * env(n, 0.002, 0.06)
def thud(seed=7, f=70, dur=0.35):
    n = int(dur * SR); return (lp(noise(n, seed), 300) + 0.8 * np.sin(2 * np.pi * f * tt(n))) * np.exp(-tt(n) * 14)
def scrape(dur=0.75, seed=5):
    n = int(dur * SR); return bp(noise(n, seed), 600, 3000) * np.linspace(1, 0.15, n) * env(n, 0.01, 0.15)
def chime2(f, dur=1.2):
    n = int(dur * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 2.8) * env(n, 0.003, 0.2)
def clunk(seed=3):
    n = int(0.3 * SR); t = tt(n)
    return (np.sin(2 * np.pi * 320 * t) * np.exp(-t * 30) + 0.6 * bp(noise(n, seed), 1500, 5000) * np.exp(-t * 60))
def radio(dur, seed=11):
    n = int(dur * SR); t = tt(n)
    return bp(noise(n, seed), 700, 2600) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 3.3 * t))) * env(n, 0.01, 0.05)
def tclick(seed=1, f=1800):
    n = int(0.025 * SR)
    return (bp(noise(n, seed), 2000, 7000) * 0.7 + np.sin(2 * np.pi * f * tt(n))) * env(n, 0.0005, 0.018)
def pop(f=900):
    n = int(0.09 * SR); t = tt(n)
    return np.sin(2 * np.pi * (f + 900 * t / 0.09) * t) * np.exp(-t * 40)
# footsteps (crowd quieter, the girl and the medics running louder)
for k, s in enumerate(E["steps"]):
    lab = s["s"] == 3
    S(step2(100 + k, 1200 if lab else 1600), s["t"], 13 if (s["i"] in (1,) and s["s"] == 1) or (s["s"] == 4 and s["i"] in (3, 4)) or lab else 18)
# the collapse: briefcase clatter, the body
S(thud(5, 160, 0.2), E["fall"][0] + 0.45, 9)
S(thud(6, 65, 0.45), E["fall"][1], 5)
# the station PA chime
for k, f in enumerate([659.3, 523.3, 392.0]): S(chime2(f), 1.0 + 0.32 * k, 15)
# the clock's minute jumps
S(clunk(1), E["one"] + 0.05, 9); S(clunk(2), E["two"], 9)
# the backpack: thump, slide
S(thud(9, 120, 0.25), E["bagDrop"] + 0.22, 9)
S(scrape(0.75, 9), E["bagDrop"] + 0.24, 11)
S(whoosh(0.3, 500, 2400, 3), E["pointed"] - 0.05, 13)
# the call: three dial tones
for k in range(3): S(beep(950 + 150 * k, 0.09), E["he"] + 0.15 + 0.13 * k, 14)
# the chat insert: a message pop, seen ticks; the title card: a paper swish + a low sting
S(pop(800), E["ever"] - 0.1, 11)
for k in range(5): S(tclick(30 + k, 2400), E["chat"] + 0.1 * k, 17)
S(whoosh(0.4, 300, 1800, 6), E["psych"] - 0.15, 12)
S(sting() * 0.7, E["bystander"] - 0.05, 12)
# the lab: intercom crackle, the chair, the run, the door
S(radio(1.8, 5), E["famous"] + 0.3, 15)
S(scrape(0.3, 12), E["run"] + 0.05, 11)
S(thud(13, 90, 0.3), E["door"] + 0.2, 9)
S(radio(1.4, 6), E["while"] + 0.1, 15)
# the medics: radio chatter; the final point: a warm chord
S(radio(0.8, 7), E["medics"][0] + 0.6, 14)
for k, f in enumerate([523.3, 659.3, 784.0]): S(chime2(f, 1.6), E["point"] + 0.05 + 0.08 * k, 11)
bed = np.zeros(N)
def seg(a, b, x, g): return x / rms(x) * SRMS * db(g) * gate(a, b, 0.08)
HALL = [(cut[0], cut[2]), (cut[3], TOTAL)]
for a, b in HALL: bed += seg(a, b, bp(noise(N, 61), 180, 1400) * (0.75 + 0.25 * np.sin(t_all * 1.3)), -30)
bed += seg(cut[2], cut[3], lp(noise(N, 64), 300) + 0.3 * np.sin(2 * np.pi * 60 * t_all), -36)
reel = np.zeros(N); at = cut[2] + 0.1
while at < cut[3] - 0.1: place(reel, bp(noise(int(0.02 * SR), int(at * 100)), 2000, 6000) * SRMS * db(-26), at); at += 0.18
bed += reel
sir = np.sin(2 * np.pi * np.cumsum(650 + 200 * np.sin(2 * np.pi * 0.6 * t_all)) / SR)
bed += bp(sir, 450, 1200) * SRMS * db(-28) * gate(cut[3] + 0.2, TOTAL, 1.0)
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
mus = phrase(0.1, E["see"], 0.42, [196.0, 0, 233.1, 0, 220.0, 0, 174.6, 0], -21)
mus += phrase(E["see"], cut[2], 0.4, [261.6, 0, 311.1, 0, 293.7, 0, 233.1, 0], -21)
mus += phrase(cut[2], cut[3], 0.36, [220.0, 261.6, 329.6, 261.6], -21)
mus += phrase(cut[3], TOTAL, 0.38, [261.6, 329.6, 392.0, 523.3, 349.2, 440.0, 523.3, 440.0], -19)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)
fx *= db(0) ** np.clip(duck * 1.3, 0, 1)
fx *= db(-5.0)
bed *= db(9); mus *= db(-9.8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.4, 0, 1)
with wave.open(str(ROOT / "out/station/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s"); print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
