"""Sound for "Why Maple Street Flips Its Doormats": the 1.25x voice (pauses kept); beds (night crickets, day and morning
birds, the kitchen clock); story SFX (footsteps, the mat whoosh and thud, the police radio and car, the camera mount
click and beep, CCTV hum, the lamp swell, the coffee cup shatter, running steps, the kitchen door); a light pluck score
that turns warm at the end. Leveled like the approved gull/museum mix (music far under the voice).
    node /tmp/me.js > out/maple/events.json (tools/t/maple_events.ts); python tools/audio_maple.py -> out/maple/premaster.wav;
    tools/master.sh out/maple/premaster.wav public/audio/maple-mix.mp3"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 36.4
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/maple/events.json").read_text())
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
x = load(ROOT / "out/maple/vo.wav")
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


def step2(seed, run=False, wood=False):
    n = int(0.08 * SR)
    s = lp(noise(n, seed), 1400 if wood else 2200) + (0.9 if wood else 0.5) * np.sin(2 * np.pi * (110 if wood else 80) * tt(n)) * np.exp(-tt(n) * 45)
    return s * env(n, 0.002, 0.06)


def thud(seed=7, f=70, dur=0.3):
    n = int(dur * SR)
    return (lp(noise(n, seed), 300) + 0.8 * np.sin(2 * np.pi * f * tt(n))) * np.exp(-tt(n) * 18)


def hum(dur, seed=9):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * 60 * t) * 0.5 + np.sin(2 * np.pi * 120 * t) * 0.3 + 0.3 * bp(noise(n, seed), 3000, 8000)) * env(n, 0.05, 0.05)


def radio(dur, seed=11):
    n = int(dur * SR)
    t = tt(n)
    chatter = bp(noise(n, seed), 700, 2600) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 3.3 * t + np.sin(2 * np.pi * 0.9 * t) * 3)))
    sq = np.zeros(n)
    k = int(0.06 * SR)
    sq[:k] = bp(noise(k, seed + 1), 1500, 7000)
    return (chatter + sq * 2) * env(n, 0.01, 0.05)


def swell(dur=1.0):
    n = int(dur * SR)
    t = tt(n)
    s = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(523.3, 1), (659.3, 0.7), (784, 0.6), (1046.5, 0.35)])
    return s * np.sin(np.linspace(0, np.pi, n)) ** 2


def kettle_tick(seed):
    n = int(0.025 * SR)
    return bp(noise(n, seed), 2500, 7000) * env(n, 0.001, 0.02)


# footsteps: porch wood in 1 and 4, street in 6, kitchen tile in 7
for k, s in enumerate(E["steps"]):
    wood = s["s"] in (1, 4) and s["t"] > (2.0 if s["s"] == 1 else 0)
    S(step2(100 + k, s["run"], wood), s["t"], 12 if s["run"] else 14)
# 1: the mat flip: whoosh, thud, little bounce; the shrug
for fl, u in [(E["flip1"], 8), (E["flip2"], 10)]:
    S(whoosh(0.4, 300, 1800, 21), fl - 0.05, u + 2)
    S(thud(31), fl + 0.42, u)
    S(thud(32, 90, 0.15), fl + 0.62, u + 6)
P("cloth.wav", E["nothing"] - 0.05, 14)
# 2: the police: car door and radio squawk; camera swing to Walt
P("slam_02.ogg", cut[1] + 0.05, 15)
S(radio(0.9), cut[1] + 0.35, 13)
S(radio(0.6, 13), E["crime"] + 0.35, 16)
S(whoosh(0.35, 500, 2400, 22), E["but"] - 0.2, 15)
# 3: the camera mount: screws click, a beep as it powers on
for k, d in enumerate([-0.55, -0.35, -0.15]):
    S(click(40 + k), E["mount"] + d, 13)
S(beep(1800, 0.09), E["mount"] + 0.1, 14)
S(beep(2400, 0.09), E["mount"] + 0.25, 14)
# 4: CCTV hum + a rec blip at the cut, the push-in whoosh, the hood
S(hum(cut[4] - cut[3]), cut[3], 17)
S(beep(1200, 0.05), cut[3] + 0.02, 14)
S(whoosh(0.35, 400, 2600, 23), E["walt2"] - 0.25, 13)
P("cloth.wav", E["hoodOff"] - 0.05, 12)
# 5: the fly across the street; the lamp swell on "lighthouse"
S(whoosh(0.6, 250, 2200, 24), E["across"] - 0.3, 12)
S(swell(1.2), E["lighthouse"] - 0.05, 13)
# 6: the sting on "up", the cup falls and shatters, she runs
S(sting(), E["up"] - 0.02, 9)
S(whoosh(0.3, 600, 2000, 25), E["dropped"] + 0.05, 15)
P("glass_01.ogg", E["mugLand"], 7)
S(splash_small := lp(noise(int(0.25 * SR), 61), 3000) * env(int(0.25 * SR), 0.002, 0.2), E["mugLand"] + 0.02, 14)
# 7: the kitchen door bangs open; she kneels
P("slam_02.ogg", E["door"], 9)
P("cloth.wav", E["fallen"] + 1.4, 13)
# 8: the crane up the street, the doormats all flipped; a soft chime at the end
S(whoosh(0.8, 200, 1600, 26), cut[7] + 0.1, 14)
P("bell_01.ogg", E["flips"] + 0.25, 16)

# ------------------------------------------------------------------ beds
bed = np.zeros(N)
NIGHT = [(cut[0], cut[1]), (cut[3], cut[4])]
DAY = [(cut[1], cut[3])]
MORN = [(cut[4], cut[6]), (cut[7], TOTAL)]
KIT = [(cut[6], cut[7])]
air = lp(noise(N, 51), 500)
air = air / rms(air) * SRMS * db(-30)
bed += air * (sum(gate(a, b, 0.06) for a, b in NIGHT + DAY + MORN) + 0.5 * sum(gate(a, b, 0.06) for a, b in KIT))
rng = np.random.default_rng(5)
cr = np.zeros(N)
for a, b in NIGHT:
    at = a
    while at < b - 0.1:
        n = int(0.05 * SR)
        place(cr, np.sin(2 * np.pi * 4300 * tt(n)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * tt(n)))) * env(n, 0.005, 0.01) * SRMS * db(-16), at)
        at += 0.33 + rng.random() * 0.08
bed += cr * (sum(gate(a, b, 0.05) for a, b in NIGHT))
bird = np.zeros(N)
for a, b in DAY + MORN:
    at = a + 0.2
    while at < b - 0.5:
        f0 = 2600 + rng.random() * 1800
        for j in range(2 + int(rng.random() * 3)):
            place(bird, chirp(f0, f0 * (1.25 + rng.random() * 0.3), 0.07) * SRMS * db(-17), at + j * 0.11)
        at += 0.9 + rng.random() * 1.4
bed += bird
tick = np.zeros(N)
at = cut[6] + 0.1
k = 0
while at < cut[7]:
    place(tick, kettle_tick(200 + k) * SRMS * db(-12), at)
    at += 0.5; k += 1
bed += tick


# ------------------------------------------------------------------ score: light plucks (mystery) -> held (shock) -> warm
def note(f, dur=1.2, bright=0.25):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 3.0) * env(n, 0.003, 0.25)


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


SNEAK = [293.7, 0, 349.2, 0, 440.0, 0, 415.3, 0, 293.7, 0, 0, 349.2, 329.6, 0, 0, 0]
TENDER = [261.6, 329.6, 392.0, 329.6, 293.7, 349.2, 440.0, 349.2]
WARM = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 349.2, 440.0]
mus = phrase(0.1, cut[4], 0.3, SNEAK, -21)
mus += phrase(cut[4], E["up"] - 0.1, 0.45, TENDER, -20)
pad_n = int((cut[7] - E["up"]) * SR)
pad = sum(np.sin(2 * np.pi * f * tt(pad_n)) for f in (146.8, 174.6, 220.0)) * env(pad_n, 0.4, 0.6)
mpad = np.zeros(N); place(mpad, lp(pad, 900), E["up"])
mus += mpad / (rms(mpad[mpad != 0]) + 1e-9) * SRMS * db(-24)
mus += phrase(cut[7], TOTAL, 0.32, WARM, -19)
mus *= db(-6) ** np.clip(duck * 1.3, 0, 1)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
fx *= db(-2.5)
bed *= db(7)
mus *= db(-8)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.4, 0, 1)
with wave.open(str(ROOT / "out/maple/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
R = lambda a: 20 * np.log10(np.sqrt(np.mean(a.astype(float) ** 2)) + 1e-9)
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
print("stem RMS dB  voice %.1f  fx %.1f  bed %.1f  music %.1f" % (R(v), R(fx), R(bed), R(mus)))
