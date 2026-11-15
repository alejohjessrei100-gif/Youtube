"""Sound for the poison short: the 1.25x voice as recorded, a light comedic plucked loop at 110 BPM (twice the 55 BPM
camera grid), room beds per set, and hits on the cuts and jokes. Reuses audio_beirut.py helpers.
    python plan/audio_poison.py -> out/audio/premaster_poison.wav, then plan/master_poison.sh"""
import re, sys, wave, json, subprocess
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
import audio_beirut as A
ROOT = Path(__file__).resolve().parent.parent
SR = A.SR
src = (ROOT / "src/poison/timing.gen.ts").read_text()
PH = float(re.search(r"PHASE = ([\d.]+)", src).group(1)); B = 60 / 55
TB = int(re.search(r"TOTAL_BEATS = (\d+)", src).group(1))
SH = json.loads(re.search(r"SHOT_BEATS = (\[.*?\]) as const", src).group(1))
TOTAL = PH + TB * B; N = int(TOTAL * SR)
bt = lambda k: 0.0 if k == 0 else PH + k * B
st = lambda i: bt(SH[i - 1][0])
def pluck(f, dur=0.35):
    n = int(dur * SR); t = A.tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 9) * A.env(n, 0.002, 0.05)
def music():
    out = np.zeros(N); b = 60 / 110
    prog = [(196.0, [392, 494, 587]), (220.0, [440, 523, 659]), (174.6, [349, 440, 523]), (196.0, [392, 494, 587])]
    for k in range(int(TOTAL / b)):
        r, ch = prog[(k // 4) % 4]
        A.place(out, A.lp(pluck(r / 2, 0.5), 600) * 0.8, k * b, 0)
        if k % 2: A.place(out, A.bp(A.noise(int(0.04 * SR), k), 5000, 11000) * A.env(int(0.04 * SR), 0.001, 0.03) * 0.3, k * b, 0)
        A.place(out, pluck(ch[k % 3], 0.3) * 0.35, k * b + b / 2, 0)
    return out
def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ROOT / "out/poison_voice.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    v = np.zeros(N); v[: min(N, len(x))] = x[:N]; v = v / np.abs(v).max() * 0.7
    duck = A.lp(np.abs(v), 3, 1); duck /= duck.max() + 1e-9
    srms = A.rms(v[np.abs(v) > 0.02]); t = A.tt(N)
    mus = music(); mus = mus / (A.rms(mus) + 1e-9) * srms * A.db(-20)
    mus *= A.db(-4) ** np.clip(duck * 1.3, 0, 1)
    # the music stops dead for the ending, then the room breathes
    mus *= np.clip((st(17) - t) / 0.05, 0, 1)
    fx = np.zeros(N)
    L = lambda pk, c: c / (np.abs(c).max() + 1e-9) * 0.7 * A.db(pk)
    P = lambda c, at, pk: A.place(fx, L(pk, c), at, 0)
    for i in range(2, 18): P(A.whoosh(0.35, 400, 3000, 60 + i), st(i) - 0.15, -26)       # soft swish into every cut
    P(A.rustle(0.4, 3), st(2) + 0.1, -18)                                           # the bite
    for k in range(4): P(A.tick(500 + 40 * k, 0.06), st(3) + 0.25 + k * 0.28, -24)   # chewing
    P(A.ping(880, 0.4), st(3) + 0.1, -18); P(A.ping(660, 0.5), st(4) + 1.2, -18)
    P(A.ping(1046, 0.3), st(5) + 0.4, -18)
    P(A.impact(0.5, 120), st(7) + 0.7, -16)                                         # allegedly
    P(A.ping(220, 0.6), st(8) + 0.05, -14); P(A.ping(208, 0.8), st(8) + 0.35, -14)  # sad trombone-ish fall
    P(A.ping(523, 0.4), st(9) + 0.3, -18)
    for k in range(10): P(A.tick(1400 + 30 * k, 0.05), st(11) + 0.1 + k * 0.18, -26)  # day counter
    n = int(0.5 * SR); gulp = A.lp(A.noise(n, 7), 400) * np.exp(-A.tt(n) * 8)
    P(gulp, st(11) + 0.6, -16)
    P(A.stamp(9), st(12) + 0.05, -14)                                               # bold
    P(A.ping(1318, 1.2), st(13) + 0.9, -16); P(A.ping(1975, 1.2), st(13) + 1.0, -22)  # magic stone shimmer
    P(A.ping(660, 0.3), st(16) + 0.05, -16); P(A.ping(990, 0.4), st(16) + 0.15, -16)  # yay
    P(A.impact(1.2, 70), st(17), -12)                                               # seven hours later
    room = A.lp(A.noise(N, 4), 500) * np.clip((t - st(15)) / 0.2, 0, 1)
    room = room / (A.rms(room) + 1e-9) * srms * A.db(-30)
    fx *= A.db(-3.5) ** np.clip(duck * 1.3, 0, 1)
    out = (v + fx + mus + room) * np.clip((TOTAL - t) / 0.3, 0, 1)
    (ROOT / "out/audio").mkdir(parents=True, exist_ok=True)
    with wave.open(str(ROOT / "out/audio/premaster_poison.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    print("total", round(TOTAL, 2))
if __name__ == "__main__":
    main()
