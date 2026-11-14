"""Sound design for "Same island": an original 60 BPM music bed, scene ambiences and ~120 synchronized one-shots.
Deterministic (fixed seeds). Every cue time comes from the film itself: beat starts from plan.json, words from
vo/timings.json, and the action phases written in src/film/shots.ts (lightning flashes, the wreck's impact, hammer
strikes from the arm swing, footfalls from the walk phase, the on-screen count).

    python plan/audio_build.py        (needs numpy + scipy)   ->  out/audio/premaster.wav, then plan/master_audio.sh

Levels follow references/audio-and-voice.md: music ~14 dB under the speech with a -3 dB duck while the voice speaks;
one-shots peak ~8 dB under the voice peak and their loudest 100 ms stays >= 6 dB under the speech RMS (a per-class
offset makes frequent sounds quieter); beds ~17-24 dB under the speech RMS.
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
TWO_PI = 2 * np.pi


def db(x):
    return 10 ** (x / 20)


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)) + 1e-12))


def load_wav(p):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


PLAN = {s["id"]: (s["t"], s["end"]) for s in json.loads((ROOT / "plan.json").read_text())["shots"]}
WORDS = json.loads((ROOT / "vo/timings.json").read_text())["turns"][0]["words"]


def T(i):
    return PLAN[i][0]


def E(i):
    return PLAN[i][1]


def W(word, nth=1):
    k = 0
    for w in WORDS:
        if re.sub(r"[^a-z0-9'-]", "", w["w"].lower()) == word:
            k += 1
            if k == nth:
                return w["t"]
    raise SystemExit(f"word not found: {word} #{nth}")


# ------------------------------------------------------------------ filters and shapes
def lp(x, f, o=2):
    return sosfilt(butter(o, min(f, SR * 0.45), "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)


def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def tt(n):
    return np.arange(n) / SR


def sweep_noise(dur, f0, f1, seed, q=0.5):
    """noise whose band sweeps from f0 to f1 (overlapping bandpassed slices)"""
    n = int(dur * SR)
    base = noise(n, seed)
    out = np.zeros(n)
    k = 14
    for i in range(k):
        c = f0 * (f1 / f0) ** ((i + 0.5) / k)
        a, b = int(n * i / k), int(min(n, n * (i + 2) / k))
        seg = bp(base[a:b], c * (1 - q * 0.5), c * (1 + q))
        out[a:b] += seg * np.hanning(b - a)
    return out


# ------------------------------------------------------------------ sound effects (each returns a mono clip)
def thunder(seed=1, dur=3.2, close=1.0):
    n = int(dur * SR)
    t = tt(n)
    crack = hp(noise(n, seed), 1200) * np.exp(-t * (26 / close)) * close
    boom = lp(noise(n, seed + 1), 180, 3) * np.exp(-t * 1.1) * (1 + 0.5 * np.sin(TWO_PI * 2.7 * t))
    roll = lp(noise(n, seed + 2), 90, 3) * np.exp(-t * 0.7) * np.clip((t - 0.2) * 4, 0, 1)
    return (crack * 0.9 + boom * 1.6 + roll * 1.4) * env(n, 0.002, 0.6)


def timber_crash(seed=3, dur=1.6):
    n = int(dur * SR)
    t = tt(n)
    thump = np.sin(TWO_PI * (95 - 40 * np.minimum(t, 0.4)) * t) * np.exp(-t * 7)
    crack = bp(noise(n, seed), 400, 4200) * np.exp(-t * 14)
    splinters = np.zeros(n)
    rng = np.random.default_rng(seed + 9)
    for _ in range(26):
        s = int(rng.uniform(0.02, 0.9) * SR)
        L = int(rng.uniform(40, 220))
        splinters[s:s + L] += bp(rng.standard_normal(L), 1500, 7000) * rng.uniform(0.2, 0.9) * np.exp(-np.arange(L) / (L / 4))
    groan = np.sin(TWO_PI * (150 + 40 * np.sin(t * 7)) * t) * np.exp(-((t - 0.45) ** 2) / 0.09) * 0.5
    return (thump * 1.2 + crack * 0.9 + splinters * 0.5 + groan) * env(n, 0.001, 0.4)


def creak(dur=1.0, f0=190, f1=130, seed=4):
    n = int(dur * SR)
    t = tt(n)
    f = np.linspace(f0, f1, n)
    ph = np.cumsum(TWO_PI * f / SR)
    pulse = 0.55 + 0.45 * np.sign(np.sin(TWO_PI * 11 * t + 3 * np.sin(TWO_PI * 1.3 * t))) * 0.5
    x = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * pulse
    x = bp(x + 0.3 * noise(n, seed), 180, 1600)
    return x * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7


def mast_fall(seed=5):
    """a long splitting groan, a crack, and the crash into the sea"""
    g = creak(0.8, 160, 240, seed)
    n = int(1.9 * SR)
    out = np.zeros(n)
    out[: len(g)] += g * 0.8
    c = timber_crash(seed + 3, 1.2)
    s = int(0.7 * SR)
    out[s:s + len(c)] += c
    return out


def wave_rush(dur=2.2, seed=6, peak=0.7):
    n = int(dur * SR)
    t = tt(n)
    shape = np.exp(-((t - dur * peak) ** 2) / (2 * (dur * 0.2) ** 2))
    return (lp(noise(n, seed), 2600) * 0.8 + bp(noise(n, seed + 1), 200, 900) * 0.8) * shape * env(n, 0.05, 0.3)


def wave_slam(seed=7, big=1.0):
    n = int(1.6 * SR)
    t = tt(n)
    thump = lp(noise(n, seed), 260, 3) * np.exp(-t * 4.5) * 2.2 * big
    hiss = hp(noise(n, seed + 1), 1500) * np.exp(-t * 3.2) * 0.8
    sheet = lp(noise(n, seed + 2), 3500) * np.exp(-((t - 0.45) ** 2) / 0.08) * 0.7
    return (thump + hiss + sheet) * env(n, 0.004, 0.4)


def splash(seed=8, dur=0.9):
    n = int(dur * SR)
    t = tt(n)
    return (hp(noise(n, seed), 900) * np.exp(-t * 7) + bp(noise(n, seed + 1), 300, 1800) * np.exp(-t * 11) * 0.8) * env(n, 0.003, 0.2)


def step(seed):
    n = int(0.14 * SR)
    t = tt(n)
    crunch = bp(noise(n, seed), 700, 5000) * np.exp(-t * 28) * (0.6 + 0.4 * np.sin(TWO_PI * 90 * t))
    thud = np.sin(TWO_PI * 70 * t) * np.exp(-t * 40) * 0.8
    return crunch + thud


def hammer(seed):
    n = int(0.3 * SR)
    t = tt(n)
    knock = np.sin(TWO_PI * (460 - 260 * np.minimum(t * 12, 1)) * t) * np.exp(-t * 38)
    click = hp(noise(n, seed), 2200) * np.exp(-t * 150) * 0.9
    ring = np.sin(TWO_PI * 1180 * t) * np.exp(-t * 18) * 0.25
    return knock + click + ring


def scrape(dur=0.5, seed=9):
    n = int(dur * SR)
    t = tt(n)
    return bp(noise(n, seed), 900, 5200) * (0.5 + 0.5 * np.abs(np.sin(TWO_PI * 7 * t))) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.6


def knife(seed):
    n = int(0.22 * SR)
    t = tt(n)
    return (bp(noise(n, seed), 1800, 7000) * np.sin(np.pi * np.linspace(0, 1, n)) * 0.7 + np.sin(TWO_PI * 900 * t) * np.exp(-t * 90) * 0.5)


def clink(f=2300, seed=10):
    n = int(0.7 * SR)
    t = tt(n)
    return (np.sin(TWO_PI * f * t) * 0.6 + np.sin(TWO_PI * f * 1.58 * t) * 0.4 + np.sin(TWO_PI * f * 2.4 * t) * 0.2) * np.exp(-t * 9) * env(n, 0.0005, 0.1)


def ping(f, dur=0.9):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(TWO_PI * f * t) + 0.35 * np.sin(TWO_PI * f * 2.01 * t) + 0.15 * np.sin(TWO_PI * f * 3.02 * t)) * np.exp(-t * 4.5) * env(n, 0.002, 0.2)


def tick(f=1800):
    n = int(0.09 * SR)
    t = tt(n)
    return np.sin(TWO_PI * f * t) * np.exp(-t * 60) + 0.4 * hp(noise(n, int(f)), 3000) * np.exp(-t * 120)


def stamp(seed=11):
    """ink pressed on paper: a soft thud and a short rub"""
    n = int(0.45 * SR)
    t = tt(n)
    return (np.sin(TWO_PI * (110 - 40 * np.minimum(t * 6, 1)) * t) * np.exp(-t * 14) * 1.3 + bp(noise(n, seed), 1200, 4500) * np.exp(-t * 9) * 0.4) * env(n, 0.002, 0.1)


def tuck(seed=12):
    """a soft cut marker: a muted thud with a breath of air"""
    n = int(0.18 * SR)
    t = tt(n)
    return (np.sin(TWO_PI * (120 - 50 * np.minimum(t * 8, 1)) * t) * np.exp(-t * 22) + lp(noise(n, seed), 1800) * np.exp(-t * 30) * 0.4) * env(n, 0.001, 0.04)


def whoosh(dur=0.7, f0=300, f1=3200, seed=13):
    n = int(dur * SR)
    x = sweep_noise(dur, f0, f1, seed)
    return x * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.4


def impact(seed=14, dur=1.8):
    n = int(dur * SR)
    t = tt(n)
    boom = np.sin(TWO_PI * (62 - 24 * np.minimum(t * 3, 1)) * t) * np.exp(-t * 3.2)
    metal = (np.sin(TWO_PI * 311 * t) + 0.7 * np.sin(TWO_PI * 466 * t) + 0.5 * np.sin(TWO_PI * 587 * t)) * np.exp(-t * 5) * 0.12
    return (boom * 1.4 + metal) * env(n, 0.003, 0.5)


def riser(dur, seed=15):
    n = int(dur * SR)
    t = tt(n)
    f = 180 * (6 ** (t / dur))
    s = np.sin(np.cumsum(TWO_PI * f / SR)) * 0.6
    return (s + 0.7 * sweep_noise(dur, 400, 5200, seed)) * (np.linspace(0, 1, n) ** 2.0) * env(n, 0.01, 0.02)


def dread_drone(dur, seed=16):
    n = int(dur * SR)
    t = tt(n)
    return (np.sin(TWO_PI * 41 * t) + 0.6 * np.sin(TWO_PI * 61.7 * t) + 0.4 * np.sin(TWO_PI * 87 * t) * np.sin(TWO_PI * 0.3 * t + 1)) * env(n, 0.5, 0.5)


# ------------------------------------------------------------------ beds (continuous ambiences)
def rain_bed(n, seed=21):
    x = bp(noise(n, seed), 2200, 9500) * 0.9 + hp(noise(n, seed + 1), 5000) * 0.35
    return x * (0.85 + 0.15 * np.sin(TWO_PI * 0.4 * tt(n) + 1))


def wind_bed(n, seed=22):
    t = tt(n)
    gust = 0.55 + 0.45 * np.sin(TWO_PI * 0.23 * t + 0.7) * np.sin(TWO_PI * 0.11 * t + 2.1)
    return (bp(noise(n, seed), 140, 800) * 1.2 + bp(noise(n, seed + 1), 600, 2400) * 0.35) * gust


def sea_bed(n, seed=23):
    t = tt(n)
    swell = 0.5 + 0.5 * np.sin(TWO_PI * 0.115 * t) ** 2
    return (lp(noise(n, seed), 420, 3) * 1.6 + bp(noise(n, seed + 1), 300, 2500) * 0.5) * swell


def fire_bed(n, seed=24):
    t = tt(n)
    rng = np.random.default_rng(seed)
    x = lp(noise(n, seed), 700) * 0.25
    for _ in range(int(n / SR * 22)):
        s = int(rng.uniform(0, n - 700))
        L = int(rng.uniform(80, 500))
        x[s:s + L] += hp(rng.standard_normal(L), 2500) * rng.uniform(0.4, 1.4) * np.exp(-np.arange(L) / (L / 4))
    return x * (0.85 + 0.15 * np.sin(TWO_PI * 0.9 * t))


def region_env(n, regions, fade=0.3):
    """a 0..1 gain envelope from (t0, t1, level) regions with fades"""
    e = np.zeros(n)
    t = tt(n)
    for t0, t1, lv in regions:
        r = np.clip((t - t0) / fade, 0, 1) * np.clip((t1 - t) / fade, 0, 1)
        e = np.maximum(e, r * lv)
    return e


# ------------------------------------------------------------------ music: 60 BPM, original
def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pad(n, t0, t1, notes, level, fade=0.9):
    t = tt(n)
    out = np.zeros(n)
    a, b = max(0, int((t0 - fade) * SR)), min(n, int((t1 + fade) * SR))
    tl = t[a:b]
    g = np.clip((tl - (t0 - fade)) / (fade * 2), 0, 1) * np.clip(((t1 + fade) - tl) / (fade * 2), 0, 1)
    for m in notes:
        f = midi(m)
        for det in (-0.0035, 0.0, 0.0035):
            ph = TWO_PI * f * (1 + det) * tl
            out[a:b] += (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.18 * np.sin(3 * ph)) * g * (0.5 if m < 52 else 0.3) / 3
    return out * level


def music(total):
    n = int(total * SR)
    t = tt(n)
    out = np.zeros(n)
    sections = [
        # (t0, t1, chord, level)  tension, hope, dread, climb, release, hollow, tension, warmth
        (0.0, T("B05"), [38, 45, 50, 53], 1.0),
        (T("B05"), 8.4, [46, 53, 58, 62], 0.7),
        (8.4, T("B12"), [41, 53, 57, 60], 0.8),
        (T("B12"), 16.3, [38, 45, 48, 51], 1.0),
        (16.3, T("B17"), [37, 44, 47, 52], 1.0),
        (T("B17"), T("B21"), [43, 50, 55, 58], 0.9),
        (T("B21"), T("B22"), [38, 45, 50, 53], 1.2),
        (T("B22"), T("B23"), [50, 57, 62, 66, 69], 1.3),
        (T("B23"), T("B25"), [38, 45, 52], 0.7),
        (T("B25"), T("B28"), [38, 45, 50, 53], 1.1),
        (T("B28"), total, [50, 57, 62, 66], 1.2),
    ]
    for t0, t1, notes, lv in sections:
        out += pad(n, t0, t1, notes, lv)
    # the 60 BPM pulse: one beat a second from t = 0; strong in tension, soft in warmth, silent while the count drops
    for k in range(int(total)):
        s = int(k * SR)
        L = int(0.55 * SR)
        tb = k + 0.0
        lv = 1.0
        if T("B22") <= tb < T("B23") or tb >= T("B28"):
            lv = 0.45
        if T("B24") + 0.9 <= tb < T("B25"):
            lv = 0.0
        tl = tt(L)
        beat = np.sin(TWO_PI * (62 - 18 * np.minimum(tl * 7, 1)) * tl) * np.exp(-tl * 9) * lv
        out[s:s + L] += beat[: n - s] * 1.5
        # an off-beat air tick on the half second, only in the tense sections
        if lv > 0.9:
            h = int((k + 0.5) * SR)
            Lh = int(0.06 * SR)
            if h + Lh < n:
                out[h:h + Lh] += hp(noise(Lh, 700 + k), 4000) * np.exp(-tt(Lh) * 70) * 0.12
    # risers into the boat's launch and into the warm last beat; a dread note under the count
    for r0, r1, lv in [(T("B19"), T("B21"), 0.55), (T("B28") - 0.5, T("B28"), 0.4)]:
        a = int(r0 * SR)
        x = riser(r1 - r0, 40 + int(r0)) * lv
        out[a:a + len(x)] += x[: n - a]
    a = int(T("B24") * SR)
    d = dread_drone(T("B25") - T("B24"))
    out[a:a + len(d)] += d * 0.5
    out += 0.015 * lp(noise(n, 7), 900)
    fade = int(0.6 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    return lp(out, 3000, 1)


# ------------------------------------------------------------------ cue lists
def hammer_times(ph, t0, t1):
    """the arm swing in shots.ts is 96 + 26 sin(2π·1.6·t + ph); the strike is its low point"""
    f = 1.6
    k = int(np.floor((t0 * f * TWO_PI + ph - 1.5 * np.pi) / TWO_PI)) - 1
    out = []
    while True:
        t = (1.5 * np.pi - ph + TWO_PI * k) / (TWO_PI * f)
        if t > t1:
            return out
        if t >= t0:
            out.append(t)
        k += 1


def footfalls(rate, phase0, t0, t1, start=0.0):
    """feet land at walk phase π/2 + kπ; the walk phase advances `rate` rad/s from `start` (relative to t0)"""
    out = []
    k = 0
    while True:
        ts = start + (np.pi / 2 + k * np.pi - phase0) / rate
        if t0 + ts > t1:
            return out
        if ts >= start:
            out.append(t0 + ts)
        k += 1


def surf_bursts(t0, period, a, b):
    out = []
    k = 0
    while t0 + k * period <= b:
        if t0 + k * period >= a:
            out.append(t0 + k * period)
        k += 1
    return out


def main():
    ws_end = WORDS[-1]["end"]
    total = ws_end + 0.6
    vo = load_wav(ROOT / "vo/voice.wav")
    n = int(total * SR)
    vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]
    fr = int(0.05 * SR)
    act = np.repeat([rms(vo[i:i + fr]) > db(-40) for i in range(0, n, fr)], fr)[:n].astype(float)
    speech_rms = rms(vo[act > 0])
    voice_peak = float(np.max(np.abs(vo)))

    mus = music(total)[:n]
    mus *= db(-14) * speech_rms / rms(mus)
    duck = lp(act, 3, 1)
    mus *= db(-3.0) ** np.clip(duck * 1.3, 0, 1)

    sfx = np.zeros(n)
    cues = []

    def place(clip, t0):
        s = int(t0 * SR)
        if s < 0 or s >= n:
            return
        e = min(n, s + len(clip))
        sfx[s:e] += clip[: e - s]

    def max_win(x, win=0.1):
        k = int(win * SR)
        if len(x) < k:
            return rms(x)
        c = np.cumsum(np.square(x))
        return float(np.sqrt(((c[k:] - c[:-k]) / k).max()))

    def hit(name, clip, t0, extra=0.0):
        g = db(-8 + extra) * voice_peak / (np.max(np.abs(clip)) + 1e-9)
        g = min(g, db(-6 + extra) * speech_rms / (max_win(clip) + 1e-9))
        place(clip * g, t0)
        cues.append((t0, name))

    def bed(name, clip, regions, under, fade=0.3):
        e = region_env(n, regions, fade)
        x = clip[:n] * e
        x *= db(-under) * speech_rms / (rms(clip[:n]) + 1e-9)
        sfx[:] += x
        cues.append((regions[0][0], name + " bed"))

    # ---- scene beds
    B = lambda a, b, lv=1.0: (T(a), E(b), lv)
    bed("rain", rain_bed(n), [B("B01", "B04"), B("B13", "B16", 0.7), B("B21", "B21", 0.9), B("B23", "B24", 0.45), B("B26", "B27")], 21, 0.35)
    bed("wind", wind_bed(n), [B("B01", "B04"), B("B06", "B08", 0.5), B("B09", "B09", 0.3), B("B13", "B18", 0.6), B("B21", "B21"), B("B23", "B27", 0.6), B("B28", "B29", 0.2)], 19, 0.4)
    bed("sea", sea_bed(n), [B("B01", "B04"), B("B06", "B06", 0.3), B("B07", "B07", 0.5), B("B13", "B16", 0.9), B("B20", "B20", 0.45), B("B21", "B21"), B("B23", "B24", 0.7), B("B26", "B27", 0.8), B("B28", "B28", 0.15)], 17, 0.4)
    bed("fire", fire_bed(n), [B("B10", "B11"), B("B28", "B29", 1.1)], 19, 0.5)

    # ---- the cuts: a soft marker on every cut (the film cuts on words; the pulse stays on the second)
    quiet_cuts = {"B02", "B03", "B04", "B05", "B12", "B25"}
    for i, (t0, _) in list(PLAN.items())[1:]:
        if i not in quiet_cuts:
            hit("cut", tuck(int(t0 * 10)), t0, -13)

    # ---- the storm (B01–B04)
    hit("thunder (strike 1)", thunder(1, 3.4, 1.0), 0.22, 1)
    hit("thunder (strike 2)", thunder(2, 2.6, 0.8), 1.12, -2)
    hit("thunder (B02)", thunder(3, 2.4, 0.9), W("two") + 0.1, -1)
    hit("whoosh (hook)", whoosh(0.7, 200, 2400, 31), 0.02, -9)
    for t0 in (0.6, 1.5, 2.2, 3.3):
        hit("hull creak (schooner)", creak(0.9, 170, 120, int(t0 * 7)), t0, -5)
    hit("rock crunch (impact)", timber_crash(41, 1.9), T("B03") + 0.1, 1)
    hit("thunder (B03)", thunder(4, 3.0, 1.1), W("wrecked") + 0.05, 0)
    hit("foremast goes", mast_fall(42), T("B03") + 0.28, -1)
    for dt in (0.1, 0.24):
        hit("spray burst", splash(int(dt * 100), 1.0), T("B03") + dt, -3)
    hit("thunder (B04)", thunder(5, 3.6, 0.6), W("remote") - 0.1, -2)
    hit("Invercauld mast falls", mast_fall(43), T("B04") + 0.35, -2)
    for t0 in surf_bursts(0.2, 2.3, T("B04"), E("B04")) + surf_bursts(1.1, 2.7, T("B04"), E("B04")):
        hit("surf on the cliff", wave_slam(int(t0 * 31), 1.2), t0, -3)

    # ---- the chart (B05) and the match cut to the camps (B06–B07)
    hit("whoosh (to the chart)", whoosh(0.55, 500, 2600, 32), T("B05") - 0.2, -8)
    hit("ink: Grafton", stamp(51), W("just") - 0.05 + 0.1, -4)
    hit("ink: Invercauld", stamp(52), W("months") + 0.1, -4)
    hit("low hit (two crosses)", impact(53, 1.5), W("apart"), -6)
    for t0 in surf_bursts(0.2, 2.3, T("B07"), E("B07")):
        hit("surf under the cliff", wave_slam(int(t0 * 37), 0.7), t0, -7)

    # ---- the Grafton camp (B08–B11)
    ts0 = T("B08")
    for i in range(5):
        for t0 in footfalls(5.2, i * 1.3, ts0, E("B08")):
            hit("footstep (carrying)", step(int(t0 * 100) + i), t0, -11 + (1 if i == 0 else 0))
    hit("spar creak", creak(0.8, 140, 170, 61), ts0 + 0.3, -9)
    hit("spar creak", creak(0.8, 150, 120, 62), ts0 + 1.0, -10)
    for ph in (0.0, 1.4):
        for t0 in hammer_times(ph, T("B09"), E("B09")):
            hit("hammer", hammer(int(t0 * 100)), t0, -6)
    for t0 in surf_bursts(T("B09") + 0.1, 0.77, T("B09"), E("B09") - 0.1):
        hit("saw stroke", scrape(0.3, int(t0 * 50)), t0, -12)
    hit("mug set down", clink(1900, 71), T("B10") + 0.55, -10)
    hit("whoosh (to the chart)", whoosh(0.6, 400, 2800, 33), T("B12") - 0.25, -8)

    # ---- the long way north (B12) and the Invercauld ledge (B13–B16)
    for i in range(22):
        # the route dashes draw eased in time; the tick of dash i lands when the eased progress reaches (i + 0.5)/22
        p = (i + 0.5) / 22
        lo, hi = 0.0, 1.0
        for _ in range(30):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if mid * mid * (3 - 2 * mid) < p else (lo, mid)
        hit("route tick", tick(1500 + 40 * i), T("B12") + (lo + hi) / 2 * 1.05, -13)
    hit("ink: Invercauld (route end)", stamp(54), T("B12") + 1.05, -5)
    hit("surf crash (ledge)", wave_slam(81, 1.5), T("B13") - 0.1, -2)
    for t0 in surf_bursts(0.2, 2.3, T("B13"), T("B14")) + surf_bursts(1.1, 2.7, T("B13"), T("B14")) + surf_bursts(0.7, 2.5, T("B13"), T("B14")):
        hit("surf on the ledge", wave_slam(int(t0 * 29), 1.0), t0, -5)
    for t0 in surf_bursts(0.3, 1.9, T("B14"), E("B14")) + surf_bursts(1.2, 2.3, T("B14"), E("B14")):
        hit("surf on the ledge", wave_slam(int(t0 * 23), 0.9), t0, -5)
    for dt in (0.3, 1.0):
        hit("body dragged on gravel", scrape(0.6, int(dt * 100)), T("B14") + dt, -7)
    for t0 in footfalls(2.75, 0.0, T("B15"), E("B15"), 0.5):
        hit("footstep (walking away)", step(int(t0 * 100)), t0, -9)
    for t0 in surf_bursts(0.2, 2.3, T("B15"), E("B16")) + surf_bursts(1.1, 2.7, T("B15"), E("B16")) + surf_bursts(0.7, 2.5, T("B15"), E("B16")):
        hit("surf on the ledge", wave_slam(int(t0 * 41), 0.9), t0, -6)
    rng = np.random.default_rng(91)
    for t0 in np.sort(rng.uniform(T("B16") + 0.05, E("B16") - 0.1, 14)):
        hit("footstep (nineteen scatter)", step(int(t0 * 100)), float(t0), -13)

    # ---- the nineteen months and the boat (B17–B21)
    for dt in (0.25, 0.65, 1.05):
        hit("knife cuts a notch", knife(int(dt * 100)), T("B17") + dt, -9)
    for t0 in hammer_times(0.0, T("B18"), E("B18")):
        hit("hammer (the boat)", hammer(int(t0 * 100) + 5), t0, -6)
    hit("hull settles (the reveal)", creak(0.9, 120, 150, 101), T("B19") + 0.35, -6)
    hit("boat hull on gravel", scrape(0.7, 102), T("B20") + 0.05, -8)
    hit("boat into the water", splash(103, 1.0), T("B20") + 0.3, -6)
    hit("hull creak (boat)", creak(0.8, 180, 140, 104), T("B20") + 0.9, -8)
    hit("boat in the swell", wave_rush(2.0, 105, 0.5), T("B20") + 0.4, -10)
    for dt in (0.15, 0.75):
        hit("boat creak (open sea)", creak(0.7, 200, 150, int(dt * 100) + 110), T("B21") + dt, -7)
    hit("thunder (open sea)", thunder(6, 3.0, 0.9), W("ocean") + 0.15, 0)
    for t0 in (T("B21") + 0.3, T("B21") + 1.0):
        hit("wave under the boat", wave_slam(int(t0 * 17), 1.2), t0, -4)

    # ---- the count (B22–B24)
    hit("sun breaks (swell)", whoosh(0.9, 250, 1800, 34), T("B22") - 0.05, -10)
    for k in range(5):
        hit("count: gold ping", ping(523.25 * 2 ** ([0, 2, 4, 7, 9][k] / 12), 1.0), T("B22") + 0.02 + k * 0.14, -8)
    hit("hollow hit (nineteen)", impact(121, 2.0), T("B23"), -4)
    for k in range(1, 17):
        hit("count: a figure goes dark", tick(1500 - 62 * k), T("B24") + k * 0.055, -10)
    hit("low thud (three)", impact(122, 2.0), T("B24") + 0.95, -3)

    # ---- the chart, the cold, the storm, the fire (B25–B29)
    hit("whoosh (to the chart)", whoosh(0.6, 400, 2800, 35), T("B25") - 0.12, -8)
    hit("low hit (route)", impact(131, 1.6), T("B25") + 0.05, -6)
    for t0 in surf_bursts(0.2, 2.3, T("B26"), E("B26")):
        hit("surf under the cliff", wave_slam(int(t0 * 19), 0.7), t0, -8)
    t0 = T("B27")
    for dt, k in ((0.1, 1.0), (0.25, 1.2), (0.4, 1.0)):
        hit("sea bursts on the ledge", wave_slam(int((t0 + dt) * 13), k * 1.6), t0 + dt, 0)
    hit("thunder (same storms)", thunder(7, 3.0, 1.0), t0 + 0.28, 1)
    hit("whoosh (to the fire)", whoosh(0.5, 300, 1600, 36), T("B28") - 0.25, -9)
    hit("fire catches", fire_bed(int(0.7 * SR), 141) * env(int(0.7 * SR), 0.05, 0.3), T("B28") - 0.05, -9)
    hit("mug passes between hands", clink(2100, 142), T("B29") + 0.72, -7)
    hit("mug taken (second clink)", clink(2700, 143), T("B29") + 0.95, -11)

    # the effects bus: duck 3.5 dB under the narrator, then limit so the loudest 100 ms (cues stacking on one moment)
    # never rises above 6.5 dB under the speech RMS
    from scipy.ndimage import minimum_filter1d, uniform_filter1d

    sfx *= db(-3.5) ** np.clip(duck * 1.3, 0, 1)
    e100 = np.sqrt(uniform_filter1d(sfx * sfx, int(0.1 * SR)) + 1e-14)
    g = np.minimum(1.0, db(-6.5) * speech_rms / e100)
    g = uniform_filter1d(minimum_filter1d(g, int(0.12 * SR)), int(0.06 * SR))
    sfx *= g

    mix = vo + mus + sfx
    peak = float(np.max(np.abs(mix)))
    if peak > 0.98:
        mix *= 0.98 / peak
    out = ROOT / "out/audio"
    out.mkdir(parents=True, exist_ok=True)
    pre = out / "premaster.wav"
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(pre)], input=pcm, check=True)
    (out / "cues.txt").write_text("\n".join(f"{t:7.2f}  {nm}" for t, nm in sorted(cues)) + "\n")
    print(f"speech RMS {20*np.log10(speech_rms):.1f} dBFS, voice peak {20*np.log10(voice_peak):.1f} dBFS, music RMS {20*np.log10(rms(mus)):.1f} dBFS, "
          f"sfx loudest 100 ms {20*np.log10(max_win(sfx)):.1f} dBFS, sfx RMS {20*np.log10(rms(sfx)):.1f} dBFS, {len(cues)} cues, {total:.2f} s")
    print("wrote", pre)


if __name__ == "__main__":
    main()
