"""Sound for the Agloe short: the 1.15x voice, a light plucked folk bed that stops when the store is gone, room and
country beds, and story SFX on their words (CC0 one-shots in assets/sfx plus synthesized wind, crickets, birds,
engine and pen scratches). Every cue is leveled against the voice.
    python tools/audio_agloe.py   -> out/audio/premaster.wav, then the two-pass loudnorm in tools/master.sh"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 34.0
N = int(TOTAL * SR)
WORDS = json.loads((ROOT / "out/audio/words.json").read_text())


def W(word, nth=1):
    k = 0
    for w, a, b in WORDS:
        if w.lower().strip(".,'\"") == word.lower() and (k := k + 1) == nth:
            return a
    raise KeyError(word)


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
x = load(ROOT / "out/audio/vo.wav")
v[: min(N, len(x))] = x[:N]
v = v / np.abs(v).max() * 0.7
VPEAK = np.abs(v).max()
SRMS = rms(v[np.abs(v) > 0.02])
duck = lp(np.abs(v), 3, 1)
duck /= duck.max() + 1e-9
t_all = tt(N)


def level(clip, under=8.0):
    """a one-shot: peak `under` dB below the voice peak, and its loudest 100 ms at least 6 dB under the speech RMS"""
    c = clip / (np.abs(clip).max() + 1e-9) * VPEAK * db(-under)
    w = int(0.1 * SR)
    if len(c) > w:
        loud = max(rms(c[i: i + w]) for i in range(0, len(c) - w, w // 4))
        cap = SRMS * db(-6)
        if loud > cap:
            c *= cap / loud
    return c


fx = np.zeros(N)
SFX = ROOT / "assets/sfx"
def P(name, at, under=8.0): place(fx, level(load(SFX / name), under), at)


# synthesized one-shots
def scratch(dur=0.13, seed=1):
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
        part = bp(nz, f * 0.6, f * 1.4)[k * seg:(k + 1) * seg]
        out[k * seg:(k + 1) * seg] = part
    return out * np.sin(np.linspace(0, np.pi, n)) ** 1.5


def chirp(f0, f1, dur, seed=0):
    n = int(dur * SR)
    f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** 2


def squeal(dur=0.35):
    n = int(dur * SR)
    f = np.linspace(1500, 1250, n)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * bp(noise(n, 4), 1000, 3000)) * env(n, 0.02, 0.15)


T = {
    "draws": W("draws"), "dot": W("dot"), "labels": W("labels"), "there": W("there"), "mixed": W("mixed"), "trap": W("trap"),
    "if": W("if"), "copied": W("copied"), "does": W("does"), "mcnally": W("mcnally"), "hes": W("he's"), "sue": W("sue"),
    "but": W("but"), "answer": W("answer"), "real": W("agloe", 4), "someone": W("someone", 2), "drove": W("drove"),
    "and1": W("and", 1), "gs": W("agloe", 5), "fake": W("fake"), "made": W("made"), "and2": W("and", 2), "town2": W("town", 2),
    "today": W("today"), "cross2": W("crossroads", 2), "on3": W("on", 3), "name": W("name"),
}

# -- the office
P("paper_01.ogg", T["draws"] - 0.05, 14)
P("drop_001.ogg", T["dot"] + 0.02, 6)                      # the pen taps the dot
for k in range(5):
    place(fx, level(scratch(0.12, k), 12), T["labels"] + 0.1 + k * 0.16)  # writing A-G-L-O-E
for k in range(5):
    P("wood-small.wav", T["mixed"] + (1 + 0.15 * k) / 1.6, 12)  # the letter tiles land
P("metal_03.ogg", T["trap"] - 0.02, 7)                     # the trap snaps
P("hit_02.ogg", T["trap"], 10)
place(fx, level(scratch(0.3, 9), 13), T["trap"] + 0.05)    # the red ring
P("paper_02.ogg", T["if"] + 0.05, 13)
P("question_001.ogg", T["copied"] + 0.1, 12)
P("error_003.ogg", T["does"] - 0.02, 8)                    # the shock
place(fx, level(scratch(0.35, 12), 13), T["mcnally"] + 0.02)
P("paper_03.ogg", T["hes"] + 0.12, 11)                     # the lawsuit lands
P("slam_02.ogg", T["sue"] - 0.02, 5)                       # the fist
P("glass_01.ogg", T["sue"] + 0.06, 14)
# -- the other office: a ticking clock; the card
for k in range(int((T["real"] - T["but"]) / 0.5)):
    place(fx, level(bp(noise(int(0.02 * SR), 30 + k), 2000, 6000) * env(int(0.02 * SR), 0.001, 0.015), 18), T["but"] + 0.1 + k * 0.5)
P("cloth.wav", T["answer"] - 0.12, 12)
P("pluck_001.ogg", T["answer"] + 0.1, 12)
# -- the country
P("bell_01.ogg", T["real"] + 0.12, 9)                      # the shop bell: Agloe is real
dur = T["and1"] - T["drove"]
eng_n = int(dur * SR)
et = tt(eng_n)
pulses = np.maximum(0, np.sin(2 * np.pi * np.cumsum(np.linspace(9, 6, eng_n)) / SR)) ** 4
eng = lp(noise(eng_n, 21), 300) * pulses + 0.4 * np.sin(2 * np.pi * 55 * et)
eng *= np.linspace(0.25, 1, eng_n) ** 1.5 * env(eng_n, 0.1, 0.3)
place(fx, level(eng, 9), T["drove"])
place(fx, level(squeal(), 14), T["and1"] - 0.25)          # brakes
for k in range(3):
    P("wooden_01.ogg", T["and1"] + 0.375 + k * 0.33, 7)    # hammering
for k, a in enumerate([0.1, 0.35, 0.6, 0.78]):
    P("wood-small.wav", T["and1"] + 0.05 + a * (T["gs"] - T["and1"] + 0.1) + 0.05, 10)  # walls, roof, porch pop up
P("bell_02.ogg", T["gs"] + 0.15, 9)                        # the sign
place(fx, level(whoosh(1.0, 300, 3000, 8), 12), T["fake"] + 0.05)  # into the dot
P("wooden_01.ogg", T["town2"] + 0.05, 8)                   # the town sign goes up
P("pluck_001.ogg", W("real", 4) + 0.02, 10)
# -- set-change swishes (quiet)
for w in ["there", "name", "if", "but", "real", "someone", "drove", "fake", "today"]:
    place(fx, level(whoosh(0.26, 500, 3000, hash(w) % 97), 16), T[w] - 0.12)

# ------------------------------------------------------------------ beds
bed = np.zeros(N)
def gate(a, b, fade=0.15):
    return np.clip((t_all - a) / fade, 0, 1) * np.clip((b - t_all) / fade, 0, 1)
office = [(0, T["there"]), (T["name"] - 0.06, T["but"]), (T["fake"] - 0.06, T["made"])]
room = lp(noise(N, 2), 400)
room = room / rms(room) * SRMS * db(-30)
for a, b in office:
    bed += room * gate(a, b)
wind = lp(noise(N, 3), 700) * (0.6 + 0.4 * np.sin(t_all * 0.7))
wind = wind / rms(wind) * SRMS * db(-24)
field = [(T["there"], T["name"] - 0.06), (T["real"], T["fake"] - 0.06), (T["made"], TOTAL)]
for a, b in field:
    bed += wind * gate(a, b)
for k in range(10):  # birds in the day
    at = T["real"] + 0.3 + k * 0.6
    if T["fake"] - 0.2 > at:
        place(bed, chirp(3400 + 300 * (k % 3), 2600, 0.09) * SRMS * db(-12), at)
        place(bed, chirp(3600, 3000, 0.07) * SRMS * db(-14), at + 0.14)
crick = np.zeros(N)  # crickets at dusk
for k in range(int((TOTAL - T["today"]) / 0.45)):
    n = int(0.12 * SR)
    c = np.sin(2 * np.pi * 4600 * tt(n)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 30 * tt(n)))) * env(n, 0.01, 0.03)
    place(crick, c, T["today"] + 0.2 + k * 0.45 + 0.05 * np.sin(k * 3))
bed += crick * SRMS * db(-20) * np.clip((t_all - T["today"]) / 0.5, 0, 1)
wind_up = (lp(noise(N, 7), 500) / 1.0)
bed += wind_up / rms(wind_up) * SRMS * db(-22) * np.clip((t_all - T["today"]) / 0.6, 0, 1)

# ------------------------------------------------------------------ music: a light plucked folk loop at 100 BPM in C
def pluck(f, dur=0.45, bright=0.4):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(2 * np.pi * f * t) + bright * np.sin(4 * np.pi * f * t) + 0.15 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 7) * env(n, 0.002, 0.05)

mus = np.zeros(N)
beat = 60 / 100
prog = [(130.8, [261.6, 329.6, 392.0]), (98.0, [246.9, 293.7, 392.0]), (110.0, [261.6, 329.6, 440.0]), (87.3, [261.6, 349.2, 440.0])]
for k in range(int(T["today"] / beat) + 1):
    root, ch = prog[(k // 4) % 4]
    at = k * beat
    place(mus, lp(pluck(root / 2, 0.7, 0.2), 500) * 0.9, at)
    place(mus, pluck(ch[(k * 2) % 3], 0.35) * 0.35, at + beat / 2)
    if k % 2:
        place(mus, pluck(ch[(k + 1) % 3] * 2, 0.25, 0.6) * 0.18, at + beat * 0.75)
mus = mus / (rms(mus) + 1e-9) * SRMS * db(-17)
mus *= db(-3) ** np.clip(duck * 1.3, 0, 1)
mus *= np.clip((T["today"] - t_all) / 0.25, 0, 1)        # the music stops when the store is gone
end_note = np.zeros(N)                                      # one soft low chord to close
place(end_note, (pluck(65.4, 3.0, 0.1) + pluck(130.8, 3.0, 0.1) * 0.5) * 0.7, T["cross2"] - 0.05)
mus += lp(end_note, 900) / (rms(end_note[end_note != 0]) + 1e-9) * SRMS * db(-20)

fx *= db(-3) ** np.clip(duck * 1.3, 0, 1)
out = (v + fx + bed + mus) * np.clip((TOTAL - t_all) / 0.6, 0, 1)
(ROOT / "out/audio").mkdir(parents=True, exist_ok=True)
with wave.open(str(ROOT / "out/audio/premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("ok", round(len(out) / SR, 2), "s; peak", round(float(np.abs(out).max()), 3))
