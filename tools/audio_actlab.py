"""Sound for the character animation trial: footsteps on every footfall, cloth on the wave, the ball (fall, bounce,
catches, toss, throw), the off-screen crash, a light plucked bed. Cue times come from the scene itself
(tools/t/act_events.ts -> out/act_events.json).   python tools/audio_actlab.py -> out/act_premaster.wav"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TOTAL = 12.5
N = int(TOTAL * SR)
E = json.loads((ROOT / "out/act_events.json").read_text())
def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
def noise(n, seed): return np.random.default_rng(seed).standard_normal(n)
def tt(n): return np.arange(n) / SR
def db(x): return 10 ** (x / 20)
def env(n, a=0.005, r=0.05):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
def load(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ROOT / "assets/sfx" / name), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64); return x / (np.abs(x).max() + 1e-9)
out = np.zeros(N)
def put(clip, t, g_db):
    i = int(t * SR); c = clip * db(g_db)
    a, b = max(0, i), min(N, i + len(c))
    if b > a: out[a:b] += c[a - i: b - i]
def step(seed):
    n = int(0.09 * SR)
    return (lp(noise(n, seed), 900) * 0.8 + bp(noise(n, seed + 50), 1500, 4000) * 0.25) * env(n, 0.002, 0.07)
def whoosh(dur, f0, f1, seed):
    n = int(dur * SR); nz = noise(n, seed); o = np.zeros(n); k = 8; seg = n // k
    for i in range(k):
        f = f0 + (f1 - f0) * i / (k - 1); o[i * seg:(i + 1) * seg] = bp(nz, f * 0.6, min(f * 1.4, 20000))[i * seg:(i + 1) * seg]
    return o * np.sin(np.linspace(0, np.pi, n)) ** 1.5
def boing(f=180, dur=0.35):
    n = int(dur * SR); t = tt(n); fr = f * (1 + 0.5 * np.exp(-t * 12))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 9)
for k, s in enumerate(E["steps"]):
    put(step(k), s, -9 + (k % 2) * 1.5)
put(load("cloth.wav"), E["wave"] - 0.05, -10)
put(load("cloth.wav"), E["wave"] + 0.55, -14)
put(whoosh(0.8, 2400, 500, 3), E["land"] - 0.8, -14)                 # the ball falls past
put(load("hit_02.ogg"), E["land"], -4); put(boing(170), E["land"], -12)
put(load("cloth.wav"), E["hopUp"] - 0.02, -8); put(step(90) * 1.4, E["hopDown"], -4)
put(load("drop_001.ogg"), E["catch1"], -6); put(load("cloth.wav"), E["catch1"] - 0.05, -12)
put(whoosh(0.35, 600, 2600, 5), E["toss"] - 0.1, -12)
put(load("drop_001.ogg"), E["catch2"], -6)
for k in range(2): put(load("pluck_001.ogg"), 8.75 + 0.3 * k, -16)   # a little proud chuckle beat
put(whoosh(0.45, 500, 3000, 7), E["throw"] - 0.25, -8); put(load("swing2.wav"), E["throw"] - 0.05, -8)
put(load("glass_01.ogg"), E["crash"], -3); put(load("slam_02.ogg"), E["crash"] + 0.03, -6); put(load("metal_03.ogg"), E["crash"] + 0.1, -10)
put(load("error_003.ogg"), E["crash"] + 0.35, -14)
# street ambience and a light plucked bed
amb = lp(noise(N, 11), 600); amb = amb / np.sqrt(np.mean(amb ** 2)) * db(-34); out += amb
def pluck(f, dur=0.45, br=0.4):
    n = int(dur * SR); t = tt(n)
    return (np.sin(2 * np.pi * f * t) + br * np.sin(4 * np.pi * f * t)) * np.exp(-t * 7) * env(n, 0.002, 0.05)
mus = np.zeros(N); beat = 60 / 108
prog = [(130.8, [261.6, 329.6, 392.0]), (98.0, [246.9, 293.7, 392.0]), (110.0, [261.6, 329.6, 440.0]), (87.3, [261.6, 349.2, 440.0])]
for k in range(int(TOTAL / beat) + 1):
    r, ch = prog[(k // 4) % 4]; at = k * beat; i = int(at * SR)
    for clip, g in [(lp(pluck(r / 2, 0.7, 0.2), 500), 0.9), (pluck(ch[(k * 2) % 3], 0.35), 0.35)]:
        j = i + (0 if g > 0.5 else int(beat / 2 * SR)); b = min(N, j + len(clip))
        if j < N: mus[j:b] += clip[: b - j] * g
mus = mus / np.sqrt(np.mean(mus ** 2)) * db(-24)
t_all = tt(N)
mus *= np.where((t_all > E["crash"]) & (t_all < E["crash"] + 0.6), 0.25, 1.0)        # the music stops dead for the crash
out = (out + mus) * np.clip((TOTAL - t_all) / 0.5, 0, 1)
with wave.open(str(ROOT / "out/act_premaster.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print("ok")
