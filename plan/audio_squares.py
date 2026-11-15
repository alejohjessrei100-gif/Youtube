"""Sound for the World Cup Square Race: a 110 BPM chiptune loop (twice the 55 BPM house tempo), a countdown and whistle,
a rising flood rumble, and one-shots at every bounce, peg, elimination, lead change and the goal, all timed from the
simulation's own events (out/squares_events.json, made by plan/squares_events.ts). Deterministic.
    python plan/audio_squares.py  ->  out/audio/premaster_squares.wav, then plan/master_squares.sh"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
import audio_beirut as A

ROOT = Path(__file__).resolve().parent.parent
SR = A.SR
d = json.loads((ROOT / "out/squares_events.json").read_text())
VO_LEN = 1.7
CD = VO_LEN + 0.1
INTRO, SLOW, OUTRO = CD + 1.6, 0.4, 3.2
FIN = d["finishT"]; S0 = FIN - 1.1; S1 = FIN + 0.5
TOTAL = INTRO + S0 + (S1 - S0) / SLOW + OUTRO + 0.4
N = int(TOTAL * SR)
def film(s):
    if s < S0: return INTRO + s
    if s < S1: return INTRO + S0 + (s - S0) / SLOW
    return INTRO + S0 + (S1 - S0) / SLOW + (s - S1)
FIN_FILM = film(FIN)
tt = A.tt

def sq(f, n, duty=0.5): return np.where((np.arange(n) * f / SR) % 1 < duty, 1.0, -1.0)
def note(f, dur, kind="sq", vol=1.0):
    n = int(dur * SR); t = tt(n)
    w = sq(f, n, 0.5) if kind == "sq" else np.sin(2 * np.pi * f * t)
    return w * np.exp(-t * (6 if kind == "sq" else 3)) * A.env(n, 0.002, 0.03) * vol
def music():
    bpm = 110; b = 60 / bpm; out = np.zeros(N)
    roots = [220.0, 174.61, 261.63, 196.0]  # A F C G
    for k in range(int(TOTAL / b) + 1):
        t0 = k * b
        if t0 < INTRO: continue
        bar = (k // 4) % 4; r = roots[bar]
        A.place(out, A.impact(0.25, 55) * 0.6, t0, 0)                                  # kick
        A.place(out, A.bp(A.noise(int(0.05 * SR), k), 6000, 12000) * A.env(int(0.05 * SR), 0.001, 0.04) * 0.25, t0 + b / 2, 0)  # hat
        A.place(out, A.lp(note(r / 2, b * 0.9), 900) * 0.35, t0, 0)                     # bass
        for j, m in enumerate([1, 1.25, 1.5, 2]):                                      # arpeggio in sixteenths
            A.place(out, A.lp(note(r * m * 2, b / 4 * 0.9, "sq", 0.12), 4000), t0 + j * b / 4, 0)
    t = tt(N)
    # duck the band in the photo finish (thinner), punch it back for the goal, fade at the end
    pf = (t > film(S0)) & (t < FIN_FILM)
    out[pf] = A.lp(out, 700)[pf] * 0.8
    out *= np.clip((TOTAL - t) / 0.6, 0, 1)
    return out

def main():
    fx = np.zeros(N); t = tt(N)
    L = lambda pk, c: c / (np.abs(c).max() + 1e-9) * 0.7 * A.db(pk)
    P = lambda c, at, pk: A.place(fx, L(pk, c), at, 0)
    for k in range(3): P(A.ping(660, 0.3), CD + 0.4 * k, -10)
    P(A.ping(1320, 0.4), CD + 1.2, -8); P(A.whistle(0.5), CD + 1.2, -10)
    vo = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ROOT / "next/squares-vo-retro.wav"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    vo = np.frombuffer(vo, dtype=np.float32).astype(np.float64)
    A.place(fx, vo / (np.abs(vo).max() + 1e-9) * 0.85, 0.1, 0)
    last = {}
    for e in d["events"]:
        at = film(e["t"]); k = e["kind"]; i = e["i"]
        if k == "hit":
            if at - last.get(("h", i), -9) < 0.12: continue
            last[("h", i)] = at; P(A.tick(900 + 120 * i, 0.06), at, -30)
        elif k == "wall":
            if at - last.get(("w", i), -9) < 0.1: continue
            last[("w", i)] = at; P(A.tick(500 + 60 * i), at, -27)
        elif k == "peg":
            if at - last.get(("p", i), -9) < 0.1: continue
            last[("p", i)] = at; P(A.ping(700 + 70 * i, 0.3), at, -22)
        elif k == "out":
            n = int(0.7 * SR)
            splash = A.bp(A.noise(n, 50 + i), 300, 3500) * np.exp(-tt(n) * 5)
            P(splash, at, -10); P(A.impact(0.5, 90), at, -14)
        elif k == "lead":
            if at - last.get("lead", -9) < 0.8 or e["t"] < 4: continue
            last["lead"] = at; P(A.ping(1046, 0.3), at, -20)
        elif k == "finish":
            if e["v"] == 1:
                P(A.impact(1.4, 60), at, -6); P(A.crowd(2.6, 77), at, -9)
                n = int(1.2 * SR); horn = (A.sweep_noise(1.2, 300, 600, 3) * 0.2 + np.sign(np.sin(2 * np.pi * 233 * tt(n))) * 0.5) * A.env(n, 0.02, 0.3)
                P(A.lp(horn, 2500), at, -11)
                for j, f in enumerate([523, 659, 784, 1046]): P(A.ping(f, 0.6), at + 0.35 + j * 0.11, -14)
            else:
                P(A.ping(784, 0.4), at, -18)
    rumble = A.lp(A.noise(N, 91), 180) * np.clip((t - film(2.4)) / 6, 0, 1) * np.clip((FIN_FILM - t) / 0.5, 0, 1)
    rumble = rumble / (A.rms(rumble) + 1e-9) * 0.018
    mus = music(); mus = mus / (np.abs(mus).max() + 1e-9) * 0.36
    out = mus + fx + rumble
    (ROOT / "out/audio").mkdir(parents=True, exist_ok=True)
    with wave.open(str(ROOT / "out/audio/premaster_squares.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    print("total", round(TOTAL, 2), "goal at", round(FIN_FILM, 2))

if __name__ == "__main__":
    main()
