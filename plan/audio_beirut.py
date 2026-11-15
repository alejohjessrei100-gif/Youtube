"""Sound for the Beirut camp film (script 4): the retimed 1.15x voice, a 55 BPM pulse, two ambiences (the camp, and a
band-limited Oklahoma flashback) and about 90 one-shots timed from the film itself (beats from src/beirut/shots.ts,
words from src/beirut/timing.gen.ts). Deterministic. Needs numpy + scipy + ffmpeg.

    python plan/audio_beirut.py   ->  out/audio/premaster_beirut.wav, then plan/master_beirut.sh

Levels follow the earlier film: effects peak about 8 dB under the voice peak, a 3.5 dB duck on the effects bus while
the voice speaks, beds well under the speech RMS, the pulse a soft tick.
"""
import json, re, subprocess
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
TWO_PI = 2 * np.pi
BPM = 55
BEAT = 60 / BPM
TOTAL = 38.2
N = int(TOTAL * SR)

db = lambda x: 10 ** (x / 20)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR * 0.45), "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)
def noise(n, seed): return np.random.default_rng(seed).standard_normal(n)
def tt(n): return np.arange(n) / SR
def env(n, a=0.005, r=0.05):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

# ------------------------------------------------------------------ timing from the film's own data
src = (ROOT / "src/beirut/timing.gen.ts").read_text()
WORDS = json.loads(re.search(r"export const WORDS = (\[.*?\]) as const", src, re.S).group(1))
SENT = json.loads(re.search(r"export const SENT = (\[.*?\]) as const", src, re.S).group(1))
def bt(b): return b * BEAT
def W(word, nth=1):
    k = 0
    for w, a, _ in WORDS:
        if re.sub(r"[^a-z0-9'-]", "", w.lower()) == re.sub(r"[^a-z0-9'-]", "", word.lower()):
            k += 1
            if k == nth: return a
    raise SystemExit(f"word not found: {word} #{nth}")

# ------------------------------------------------------------------ the voice, retimed sentence by sentence
def voice():
    v = ROOT / "next/niche-examples/4-psychology-beirut-voice_1.15x.mp3"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(v), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N + SR); pad = 0.09
    for s in SENT:
        a = max(0, int((s["src_start"] - pad) * SR)); b = min(len(x), int((s["src_end"] + pad) * SR))
        seg = x[a:b].copy(); f = int(0.03 * SR)
        seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        o = int((s["vs"] - pad) * SR)
        if o < 0: seg, o = seg[-o:], 0
        out[o:o + len(seg)] += seg
    return out[:N]

# ------------------------------------------------------------------ sounds
def sweep_noise(dur, f0, f1, seed, q=0.5):
    n = int(dur * SR); base = noise(n, seed); out = np.zeros(n); k = 14
    for i in range(k):
        c = f0 * (f1 / f0) ** ((i + 0.5) / k); a, b = int(n * i / k), int(min(n, n * (i + 2) / k))
        out[a:b] += bp(base[a:b], c * (1 - q * 0.5), c * (1 + q)) * np.hanning(b - a)
    return out
def ping(f, dur=0.8):
    n = int(dur * SR); t = tt(n)
    return (np.sin(TWO_PI * f * t) + 0.35 * np.sin(TWO_PI * f * 2.01 * t) + 0.12 * np.sin(TWO_PI * f * 3.02 * t)) * np.exp(-t * 5) * env(n, 0.002, 0.2)
def tick(f=1800, dur=0.09):
    n = int(dur * SR); t = tt(n)
    return np.sin(TWO_PI * f * t) * np.exp(-t * 60) + 0.4 * hp(noise(n, int(f)), 3000) * np.exp(-t * 120)
def block(f=900):
    """the pulse: a soft wooden tick"""
    n = int(0.12 * SR); t = tt(n)
    return (np.sin(TWO_PI * f * t) + 0.5 * np.sin(TWO_PI * f * 2.3 * t)) * np.exp(-t * 38) * env(n, 0.0006, 0.03)
def stamp(seed=11):
    n = int(0.45 * SR); t = tt(n)
    return (np.sin(TWO_PI * (110 - 40 * np.minimum(t * 6, 1)) * t) * np.exp(-t * 14) * 1.3 + bp(noise(n, seed), 1200, 4500) * np.exp(-t * 9) * 0.4) * env(n, 0.002, 0.1)
def whoosh(dur=0.7, f0=300, f1=3200, seed=13):
    return sweep_noise(dur, f0, f1, seed) * np.sin(np.pi * np.linspace(0, 1, int(dur * SR))) ** 1.4
def impact(dur=1.4, f=62):
    n = int(dur * SR); t = tt(n)
    return np.sin(TWO_PI * (f - 24 * np.minimum(t * 3, 1)) * t) * np.exp(-t * 3.4) * 1.4 * env(n, 0.003, 0.4)
def hiss(dur=0.8, seed=5):
    n = int(dur * SR); return bp(noise(n, seed), 2500, 9000) * np.exp(-tt(n) * 4.5) * env(n, 0.01, 0.2)
def rustle(dur=0.6, seed=6):
    n = int(dur * SR); g = np.abs(lp(noise(n, seed + 1), 14)) * 4
    return bp(noise(n, seed), 1800, 7000) * np.minimum(g, 1) * env(n, 0.03, 0.2)
def whistle(dur=0.6):
    n = int(dur * SR); t = tt(n)
    f = 2850 + 70 * np.sin(TWO_PI * 26 * t)
    return (np.sin(np.cumsum(TWO_PI * f / SR)) * 0.8 + 0.25 * bp(noise(n, 3), 2400, 4200)) * env(n, 0.01, 0.12) * (0.85 + 0.15 * np.sin(TWO_PI * 6 * t))
def creak(dur=0.9, f0=210, f1=150, seed=4):
    n = int(dur * SR); t = tt(n); f = f0 + (f1 - f0) * t / dur
    return (np.sin(np.cumsum(TWO_PI * f / SR)) * (0.5 + 0.5 * np.sin(TWO_PI * 17 * t)) + 0.3 * bp(noise(n, seed), 300, 1500)) * env(n, 0.05, 0.2)
def crowd(dur=0.9, seed=7):
    n = int(dur * SR); g = 0.6 + 0.4 * np.sin(TWO_PI * 5 * tt(n))
    return bp(noise(n, seed), 450, 2600) * g * env(n, 0.02, 0.35)

def place(buf, clip, t, gain_db=0.0):
    a = int(t * SR)
    if a >= len(buf) or a + len(clip) <= 0: return
    c = clip * db(gain_db)
    if a < 0: c, a = c[-a:], 0
    e = min(len(buf), a + len(c)); buf[a:e] += c[: e - a]

# ------------------------------------------------------------------ beds
def slow(seed, f=0.4, n=N): return 0.5 + 0.5 * np.tanh(lp(noise(n, seed), f, 1) * 40)
def camp_bed():
    n = N
    wind = lp(noise(n, 21), 700) * slow(22, 0.25) * 0.5
    cic = bp(noise(n, 23), 4200, 7600) * (0.55 + 0.45 * np.sin(TWO_PI * 38 * tt(n))) * slow(24, 0.2)
    kids = np.zeros(n)
    rng = np.random.default_rng(25)
    for _ in range(26):
        d = rng.uniform(0.15, 0.4); m = int(d * SR); a = int(rng.uniform(0, TOTAL - 0.5) * SR)
        g = bp(noise(m, int(rng.integers(1e6))), 700, 2400) * np.hanning(m) * rng.uniform(0.3, 1)
        e = min(n, a + m); kids[a:e] += g[: e - a]
    return wind * 1.0 + cic * 0.55 + lp(kids, 3000) * 0.7
def okla_bed():
    n = N
    wind = bp(noise(n, 31), 250, 1500) * slow(32, 0.3) * 0.8
    cri = bp(noise(n, 33), 3000, 4800) * (0.5 + 0.5 * np.sin(TWO_PI * 11 * tt(n))) * slow(34, 0.25) * 0.6
    return lp(wind + cri, 5200, 2)
def xfade(a, b, t0, t1):
    """a before t0, b after t1, equal-power in between"""
    t = tt(N); u = np.clip((t - t0) / max(1e-6, t1 - t0), 0, 1)
    return a * np.cos(u * np.pi / 2) + b * np.sin(u * np.pi / 2)

def main():
    v = voice()
    vpeak = np.abs(v).max(); v = v / vpeak * 0.7
    act = np.abs(v); duck = lp(act, 3, 1); duck = duck / (duck.max() + 1e-9)
    speech_rms = rms(v[np.abs(v) > 0.02])
    flash0, flash1 = bt(14), bt(23)
    # beds: Beirut camp, then the Oklahoma flashback, then Beirut again; all fade out over the last second
    beds = xfade(xfade(camp_bed(), okla_bed(), flash0 - 0.15, flash0 + 0.1), camp_bed(), flash1 - 0.15, flash1 + 0.1)
    tail = np.clip((TOTAL - 0.25 - tt(N)) / 0.9, 0, 1)
    beds = beds / (rms(beds) + 1e-9) * speech_rms * db(-21) * tail
    # pulse: a soft wooden tick on every beat, thinner in the flashback
    pulse = np.zeros(N)
    for k in range(0, 36):
        t = bt(k)
        if flash0 <= t < flash1: place(pulse, lp(block(700), 2200), t, -9)
        else: place(pulse, block(900), t, 0)
    pulse = pulse / (np.abs(pulse).max() + 1e-9) * 0.7 * db(-24)
    fx = np.zeros(N)
    L = lambda peak_db, clip: clip / (np.abs(clip).max() + 1e-9) * 0.7 * db(peak_db)
    P = lambda clip, t, peak_db: place(fx, L(peak_db, clip), t, 0)
    # shots 1-2
    P(tick(1900), 0.04, -16)
    P(whoosh(1.2, 500, 3200, 41), 2.35, -22); P(ping(880, 0.6), W("Beirut."), -16)
    # shot 3: a rising pluck per beat, a pop per badge
    P(ping(392, 0.7), bt(4), -14); P(ping(494, 0.7), bt(5), -14)
    cr = [0.045 * (n + 1) for n in range(10)]; cm = [0.045 * (n + 1) for n in range(8)]
    for d in cr: P(tick(1250 + 40 * d * 20), bt(4) + d, -22)
    for d in cm: P(tick(1500 + 40 * d * 20), bt(5) + d, -22)
    P(whoosh(0.9, 250, 2200, 42), bt(6), -17)                       # shot 4: the shuffle
    for k in range(9): P(tick(1300 + 50 * k), bt(7) + 0.04 * k + 0.05, -24); P(tick(1300 + 50 * k), bt(10) + 0.04 * k + 0.05, -24)
    P(tick(1800), W("four"), -18); P(tick(1800), W("four", 2), -18)
    P(ping(659, 0.8), W("Red"), -15); P(ping(523, 0.8), W("Blue"), -15)
    P(rustle(0.55, 8), bt(12.3), -22); P(whoosh(0.6, 3200, 300, 44), bt(13.4), -20)  # shot 7: paper, then the wipe
    P(impact(1.2, 70), bt(14), -14); P(stamp(12), W("Oklahoma,"), -17)               # into the flashback
    P(hiss(0.9, 9), bt(16) + 0.1, -22); P(tick(1800), W("twenty-two"), -18)          # the bus
    P(whoosh(0.5, 500, 3000, 45), bt(18), -20)                                        # shot 10: chalk
    P(tick(800), bt(19.4), -16); P(tick(700), bt(20.2), -14); P(tick(950), bt(20.2) + 0.07, -18)  # scoreboard
    P(whoosh(0.5, 300, 3000, 46), bt(23) - 0.3, -20); P(impact(0.9, 90), bt(23), -16)           # colour returns
    for k in range(8): P(tick(1150 + 70 * k), W("label") + 0.18 * k, -21)
    P(ping(440, 0.8), bt(26.6), -17); P(ping(554, 0.8), bt(27.1), -17)               # two lines
    for i in range(18): P(tick(1200 + 30 * i), bt(26) + 0.02 * i + 0.05, -28)
    P(whistle(0.55), bt(28) + 0.02, -12); P(creak(0.9, 210, 150, 47), bt(28.4), -22)   # tug of war
    P(impact(1.4, 58), bt(30), -9); P(crowd(0.9, 48), bt(30), -16); P(whoosh(0.8, 200, 2500, 49), bt(30) + 0.05, -20)  # the fight
    P(whoosh(0.5, 500, 3000, 50), bt(31) - 0.1, -22)
    for i in range(18): P(tick(1100 + 40 * i), bt(31) + 0.1 * i + 0.05, -27)
    P(stamp(13), W("Not"), -11); P(impact(0.8, 80), W("Not"), -16)                   # the X
    P(stamp(14), W("Red", 2), -14); P(stamp(15), W("Blue", 2), -14)
    # the effects bus: duck 3.5 dB under the narrator, tail out
    fx *= db(-3.5) ** np.clip(duck * 1.3, 0, 1)
    pulse *= db(-3.5) ** np.clip(duck * 1.3, 0, 1)
    out = v + fx + pulse + beds
    out *= np.clip((TOTAL - tt(N)) / 0.15, 0, 1)
    wav = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    (ROOT / "out/audio").mkdir(parents=True, exist_ok=True)
    import wave
    with wave.open(str(ROOT / "out/audio/premaster_beirut.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(wav.tobytes())
    print("voice rms", round(speech_rms, 4), "fx peak", round(float(np.abs(fx).max()), 3), "beds rms", round(rms(beds), 4), "pulse peak", round(float(np.abs(pulse).max()), 3), "mix peak", round(float(np.abs(out).max()), 3))

if __name__ == "__main__":
    main()
