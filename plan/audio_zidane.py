"""Sound for the Zidane short: the 1.15x voice as recorded (not retimed), a stadium crowd bed that drops to room tone
for the last two shots, a soft 55 BPM pulse, and one-shots at the cuts. Reuses the synth helpers of audio_beirut.py.
    python plan/audio_zidane.py  ->  out/audio/premaster_zidane.wav, then plan/master_zidane.sh"""
import re, sys, wave, json, subprocess
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
import audio_beirut as A

ROOT = Path(__file__).resolve().parent.parent
SR = A.SR
src = (ROOT / "src/zidane/timing.gen.ts").read_text()
PHASE = float(re.search(r"PHASE = ([\d.]+)", src).group(1))
BEAT = 60 / 55
TOTAL = PHASE + 27 * BEAT
N = int(TOTAL * SR)
bt = lambda k: 0.0 if k == 0 else PHASE + k * BEAT
WORDS = json.loads(re.search(r"export const WORDS = (\[.*?\]) as const", src, re.S).group(1))
def W(word, nth=1):
    k = 0
    for w, a, _ in WORDS:
        if re.sub(r"[^a-z0-9']", "", w.lower()) == word:
            k += 1
            if k == nth: return a
    raise SystemExit(word)

def crowd(n, seed):
    base = A.bp(A.noise(n, seed), 250, 2800)
    swell = 0.6 + 0.4 * np.tanh(A.lp(A.noise(n, seed + 1), 0.3, 1) * 30)
    chant = 1 + 0.25 * np.sin(2 * np.pi * 1.8 * A.tt(n)) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * A.tt(n)))
    return base * swell * chant
def radio(dur=0.5, seed=31):
    n = int(dur * SR); return A.bp(A.noise(n, seed), 1800, 4200) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 23 * A.tt(n)))) * A.env(n, 0.01, 0.1)

def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ROOT / "next/football-scripts/6-zidane-voice_1.15x.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    v = np.zeros(N); v[: min(N, len(x))] = x[:N]
    v = v / np.abs(v).max() * 0.7
    duck = A.lp(np.abs(v), 3, 1); duck /= duck.max() + 1e-9
    srms = A.rms(v[np.abs(v) > 0.02])
    t = A.tt(N)
    room0 = bt(22)
    stad = crowd(N, 5) * np.clip((room0 + 0.15 - t) / 0.3, 0, 1)
    room = A.lp(A.noise(N, 9), 300) * 0.3 * np.clip((t - room0 + 0.1) / 0.3, 0, 1)
    beds = stad / (A.rms(stad) + 1e-9) * srms * A.db(-17) + room / (A.rms(room) + 1e-9) * srms * A.db(-30)
    beds *= np.clip((TOTAL - t) / 0.4, 0, 1)
    pulse = np.zeros(N)
    for k in range(0, 27): A.place(pulse, A.block(900 if bt(k) < room0 else 600), bt(k), 0)
    pulse = pulse / (np.abs(pulse).max() + 1e-9) * 0.7 * A.db(-26)
    fx = np.zeros(N)
    L = lambda pk, c: c / (np.abs(c).max() + 1e-9) * 0.7 * A.db(pk)
    P = lambda c, at, pk: A.place(fx, L(pk, c), at, 0)
    P(A.impact(0.9, 80), bt(2), -18)                                   # the card in the pocket
    P(A.whoosh(1.4, 300, 2600, 41), bt(3) - 0.2, -20)                  # crane
    P(A.tick(1700), bt(3) + 0.15, -18); P(A.tick(1500), bt(3) + 0.5, -20)  # chips
    hit = bt(7) + 0.42 * (bt(9) - bt(7))
    P(A.impact(1.2, 70), hit, -8); P(A.stamp(21), hit, -14)            # the headbutt
    P(A.crowd(1.0, 22), bt(9), -14)                                    # gasp as he drops
    P(A.whoosh(0.5, 2500, 400, 43), bt(10) - 0.1, -24)
    P(A.ping(440, 0.7), bt(13) + 0.1, -18)                             # the question
    P(radio(0.6), bt(15) + 0.3, -16); P(radio(0.4, 33), bt(17), -18)   # headset
    P(A.whistle(0.9), bt(18), -10); P(A.tick(1900), bt(18) + 0.12, -16)  # red card
    P(A.crowd(1.6, 24), bt(20), -12)                                   # Italy celebrate
    P(A.whoosh(0.7, 3000, 300, 45), room0 - 0.25, -18); P(A.tick(1600), room0 + 0.1, -20)
    P(A.ping(659, 1.4), bt(24) + 0.3, -13); P(A.ping(988, 1.4), bt(24) + 0.42, -18)  # the reveal
    fx *= A.db(-3.5) ** np.clip(duck * 1.3, 0, 1); pulse *= A.db(-3.5) ** np.clip(duck * 1.3, 0, 1)
    out = (v + fx + pulse + beds) * np.clip((TOTAL - t) / 0.15, 0, 1)
    (ROOT / "out/audio").mkdir(parents=True, exist_ok=True)
    with wave.open(str(ROOT / "out/audio/premaster_zidane.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    print("total", round(TOTAL, 2), "s; headbutt hit at", round(hit, 2))

if __name__ == "__main__":
    main()
