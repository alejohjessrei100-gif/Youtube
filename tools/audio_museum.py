"""Sound for the museum short ("The Man Who Steals Nothing"): the 1.10x voice; beds per place (the night gallery's
hollow room tone, the office's CRT hum, CCTV hiss, the sunny attic, rain on the lobby glass); story SFX on their cues
(CC0 one-shots in assets/sfx plus synthesized alarm, clicks, marker, steps, rip, whooshes); a soft piano-like score:
a tiptoeing mystery, a warm memory, a sad lobby, a gentle resolve. Leveled like the approved gull mix (music far under
the voice).
    python tools/audio_museum.py -> out/museum/premaster.wav, then tools/master.sh"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 28.6
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/museum/events.json").read_text())
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
x = load(ROOT / "out/museum/vo.wav")
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
# 1. the alarm (two-tone), the door bang, flashlight clicks, the guards' steps, the 11th mark, the whip, the shrug,
#    the frame set straight, the reveal chime
c1 = CUTS[1]
alarm = np.zeros(N)
k = 0
while k * 0.45 < E["every"] + 0.5:
    place(alarm, beep(960 if k % 2 == 0 else 760, 0.38) * 0.6, k * 0.45)
    k += 1
alarm *= np.clip((E["every"] + 0.5 - t_all) / 0.4, 0, 1)
fx += alarm / (np.abs(alarm).max() + 1e-9) * VPEAK * db(-15)
P("slam_02.ogg", E["broken"] - 0.2, 6)
S(click(1), E["broken"] - 0.1, 10)
S(click(2), E["broken"], 10)
for seg, seed0 in ((E["dSteps"][0], 10), (E["dSteps"][1], 30), (E["mSteps"][0], 50), (E["mSteps"][1], 70)):
    tt0, tt1 = seg["t0"], seg["t1"]
    n = max(2, int((tt1 - tt0) / 0.32))
    for i in range(n):
        S(step(seed0 + i), tt0 + (tt1 - tt0) * (i + 0.5) / n, 13)
S(scratch(0.2, 3), E["eleven"] + 0.05, 9)
S(scratch(0.12, 4), E["eleven"] + 0.3, 10)
S(whoosh(0.45, 300, 2200, 7), E["nothing"] + 0.3, 11)
P("cloth.wav", E["stolen"] - 0.4, 10)
P("wood-small.wav", E["crooked"] + 0.05, 9)
P("bell_01.ogg", E["yellow"] - 0.2, 12)
# 2. the office: a CRT blip; the push into the screen ends on a static hiss
S(beep(1800, 0.06), CUTS[1] + 0.05, 12)
S(lp(noise(int(0.4 * SR), 9), 6000) * env(int(0.4 * SR), 0.2, 0.1), CUTS[2] - 0.3, 11)
# 3. CCTV: a record beep, a fast-forward whir across the hour, the frame touched, steps away
S(beep(2200, 0.05), CUTS[2] + 0.1, 12)
ff = whoosh(E["hour"] + 0.3 - E["standing"], 600, 3200, 11)
S(ff, E["standing"], 12)
P("wood-small.wav", E["then1"] + 0.1, 11)
for i in range(3):
    S(step(90 + i, False), E["leave"] + 0.15 + i * 0.32, 15)
# 4. caught: two flashlight clicks, a sting, the hood, the point, the ID card
S(click(5), E["twelfth"] + 0.25, 8)
S(click(6), E["caught"] - 0.05, 8)
S(sting(), E["caught"] - 0.05, 5)
P("cloth.wav", E["e81"] - 0.05, 9)
S(whoosh(0.25, 800, 2400, 13), E["pointed"] - 0.05, 13)
P("paper_01.ogg", E["it2"], 10)
# 5. the attic: brush strokes, the door, the cash
for i in range(5):
    S(scratch(0.12, 20 + i) * 0.7, CUTS[4] + 0.15 + i * 0.27, 14)
P("wooden_01.ogg", E["sold"] - 0.5, 10)
P("paper_02.ogg", E["rent"] - 0.05, 10)
# 6. the lobby: coins in the palm, the hand closing on them
S(jingle(4), E["she"] + 0.15, 11)
S(jingle(7) * 0.7, E["see"] + 0.05, 12)
# 7. the charge sheet torn, the key, the frame nudged, a last soft bell
S(rip(), E["charges"] - 0.02, 8)
S(jingle(9), E["gave"] + 0.05, 9)
P("metal_03.ogg", E["key"], 12)
P("wood-small.wav", E["key"] + 1.55, 11)
P("bell_02.ogg", E["key"] + 1.2, 13)

# ------------------------------------------------------------------ beds
bed = np.zeros(N)
room = lp(noise(N, 7), 220)
room = room / rms(room) * SRMS * db(-26)
gal = gate(0, CUTS[1]) + gate(CUTS[2], CUTS[4]) + gate(CUTS[6], TOTAL)
bed += room * gal
hum = (np.sin(2 * np.pi * 60 * t_all) + 0.4 * np.sin(2 * np.pi * 120 * t_all)) * SRMS * db(-28)
bed += hum * gate(CUTS[1], CUTS[2])
hiss = hp(noise(N, 12), 3000)
hiss = hiss / rms(hiss) * SRMS * db(-30)
bed += hiss * gate(CUTS[2], CUTS[3])
attic = lp(noise(N, 13), 500)
attic = attic / rms(attic) * SRMS * db(-30)
bed += attic * gate(CUTS[4], CUTS[5])
for i in range(6):
    place(bed, chirp(3200 + 300 * (i % 3), 4200, 0.09) * SRMS * db(-14), CUTS[4] + 0.2 + i * 0.41)
rain = bp(noise(N, 14), 1200, 7000) * (0.8 + 0.2 * np.sin(t_all * 1.3))
rain = rain / rms(rain) * SRMS * db(-22)
bed += rain * gate(CUTS[5], CUTS[6])


# ------------------------------------------------------------------ score: soft felt-piano plucks
def note(f, dur=1.2, bright=0.25):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 3.2) * env(n, 0.004, 0.2)


def phrase(t0, t1, beat, seq, gain_db):
    out = np.zeros(N)
    k = 0
    while t0 + k * beat < t1:
        f = seq[k % len(seq)]
        if f:
            place(out, lp(note(f), 2400), t0 + k * beat)
        k += 1
    out *= gate(t0, t1, 0.25)
    return out / (rms(out[out != 0]) + 1e-9) * SRMS * db(gain_db)


# a tiptoeing minor figure (gallery, office, CCTV, the catch)
TIP = [220.0, 0, 261.6, 0, 246.9, 0, 196.0, 0, 220.0, 0, 329.6, 0, 311.1, 0, 293.7, 0]
# warm memory (major), sad lobby (low, slow), the resolve (major, open)
WARM = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6]
SAD = [220.0, 0, 0, 174.6, 0, 0, 164.8, 0, 0]
HOME = [261.6, 392.0, 523.3, 659.3, 523.3, 392.0, 349.2, 440.0, 523.3]
mus = phrase(0.3, CUTS[3], 0.3, TIP, -20)
mus += phrase(CUTS[3] + 0.9, CUTS[4], 0.42, [110.0, 0, 103.8, 0, 98.0, 0], -20)
mus += phrase(CUTS[4], CUTS[5], 0.32, WARM, -18)
mus += phrase(CUTS[5], CUTS[6], 0.45, SAD, -19)
mus += phrase(CUTS[6], TOTAL, 0.36, HOME, -18)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
bed *= db(4)
fx *= db(-4)
mus *= db(-8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.5, 0, 1)
with wave.open(str(ROOT / "out/museum/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
