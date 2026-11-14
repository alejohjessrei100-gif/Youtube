"""Audio for "Same island": an original music bed + synthesized story SFX, leveled against the voice, mixed under it.
Deterministic (fixed seeds). Every cue is anchored to a WORD of vo/timings.json, never a typed time.

    python plan/audio_build.py            -> out/audio/premaster.wav (then master with ffmpeg loudnorm, see main())

Levels follow references/audio-and-voice.md: music bed ~14 dB under the speech with a -3 dB duck while the voice
speaks; one-shot SFX peak ~8 dB under the voice peak and their loudest 100 ms window >= 6 dB under the speech RMS;
beds (wind, fire) ~20 dB under the speech RMS.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parent.parent


def db(x):
    return 10 ** (x / 20)


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)) + 1e-12))


def load_wav(p):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


def words():
    w = json.loads((ROOT / "vo/timings.json").read_text())["turns"][0]["words"]
    return w


def at(ws, word, nth=1):
    k = 0
    for w in ws:
        if re.sub(r"[^a-z0-9']", "", w["w"].lower()) == word:
            k += 1
            if k == nth:
                return w["t"]
    raise SystemExit(f"cue word not found: {word} #{nth}")


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, cut):
    # one-pole low-pass (deterministic, cheap)
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def lp(x, cut, passes=2):
    for _ in range(passes):
        x = lowpass(x, cut)
    return x


def hp(x, cut):
    return x - lp(x, cut, 1)


# ------------------------------------------------------------------ music: a slow, serious bed (original)
def music(total):
    rng = np.random.default_rng(7)
    n = int(total * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    A4 = 440.0
    f = lambda m: A4 * 2 ** ((m - 69) / 12)
    # D minor, Bb, F, C ... then a lift to D major for the payoff
    prog = [(0.0, [50, 57, 62, 65]), (4.5, [46, 53, 58, 62]), (9.0, [41, 53, 57, 60]), (13.5, [48, 55, 60, 64]),
            (18.0, [50, 57, 62, 65]), (22.5, [46, 53, 58, 65]), (27.0, [43, 55, 58, 62]), (31.0, [50, 57, 62, 66])]
    for i, (t0, notes) in enumerate(prog):
        t1 = prog[i + 1][0] if i + 1 < len(prog) else total
        a, b = int(t0 * SR), min(n, int((t1 + 0.8) * SR))
        tt = t[a:b] - t0
        e = np.minimum(1, tt / 1.2) * np.clip((t1 + 0.8 - t0 - tt) / 1.2, 0, 1)
        for m in notes:
            fr = f(m)
            v = 0.6 * np.sin(2 * np.pi * fr * tt) + 0.25 * np.sin(2 * np.pi * fr * 2.003 * tt) + 0.1 * np.sin(2 * np.pi * fr * 3.01 * tt)
            out[a:b] += v * e * (0.5 if m < 52 else 0.3)
    # a soft low pulse every 1.5 s (a heartbeat under the story), stopping for the payoff
    for k in range(int(30 / 1.5)):
        s = int(k * 1.5 * SR)
        L = int(0.5 * SR)
        tt = np.arange(L) / SR
        out[s:s + L] += 0.35 * np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 9)
    out += 0.02 * lp(rng.standard_normal(n), 900)
    fade = int(0.6 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    return lp(out, 2500, 1)


# ------------------------------------------------------------------ SFX (deterministic)
def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def hull_crack(seed=1):
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (70 - 30 * t) * t) * np.exp(-t * 6)
    crack = hp(noise(n, seed), 1500) * np.exp(-t * 18)
    creak = np.sin(2 * np.pi * (180 + 40 * np.sin(t * 9)) * t) * np.exp(-((t - 0.5) ** 2) / 0.05) * 0.4
    return (thump + 0.7 * crack + creak) * env(n)


def wind(dur, seed=2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = lp(noise(n, seed), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t + 1))
    return x * env(n, 0.6, 0.8)


def knock(seed):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 320 * t) * 0.6 + hp(noise(n, seed), 900) * 0.6) * np.exp(-t * 40) * env(n, 0.001, 0.02)


def hammering(count=3, gap=0.33):
    out = np.zeros(int((count * gap + 0.3) * SR))
    for i in range(count):
        k = knock(10 + i)
        s = int(i * gap * SR)
        out[s:s + len(k)] += k
    return out


def fire(dur, seed=3):
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    x = lp(noise(n, seed), 1200) * 0.3
    for _ in range(int(dur * 14)):
        s = int(rng.uniform(0, n - 600))
        L = int(rng.uniform(80, 400))
        x[s:s + L] += hp(rng.standard_normal(L), 2500) * rng.uniform(0.5, 1.4) * np.exp(-np.arange(L) / (L / 4))
    return x * env(n, 0.3, 0.5)


def surf(dur=2.2, seed=4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    shape = np.exp(-((t - 0.7) ** 2) / 0.12) + 0.5 * np.exp(-((t - 1.6) ** 2) / 0.2)
    return lp(noise(n, seed), 1800) * shape * env(n, 0.05, 0.3)


def saw_strokes(count=2, stroke=0.42):
    out = np.zeros(int((count * stroke * 1.05 + 0.2) * SR))
    for i in range(count):
        n = int(stroke * SR)
        t = np.arange(n) / SR
        x = hp(noise(n, 20 + i), 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * t) ** 2) * np.sin(np.pi * t / stroke)
        s = int(i * stroke * 1.05 * SR)
        out[s:s + n] += x
    return out


def wave_crash(seed=5):
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    swell = lp(noise(n, seed), 500) * np.clip(t / 0.5, 0, 1) * np.exp(-np.clip(t - 0.5, 0, None) * 2.2)
    crash = lp(noise(n, seed + 1), 3500) * np.exp(-((t - 0.55) ** 2) / 0.04)
    return (swell + 0.8 * crash) * env(n, 0.02, 0.4)


def thunder(seed=6):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    x = lp(noise(n, seed), 160, 3) * (np.exp(-t * 1.4)) * (1 + 0.6 * np.sin(2 * np.pi * 2.3 * t))
    return x * env(n, 0.08, 0.6)


def place(track, clip, t0):
    s = int(t0 * SR)
    e = min(len(track), s + len(clip))
    track[s:e] += clip[: e - s]


def max_win(x, win=0.1):
    n = int(win * SR)
    if len(x) < n:
        return rms(x)
    c = np.cumsum(np.square(x))
    w = (c[n:] - c[:-n]) / n
    return float(np.sqrt(w.max()))


def main():
    ws = words()
    total = ws[-1]["end"] + 0.6
    vo = load_wav(ROOT / "vo/voice.wav")
    n = int(total * SR)
    vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]
    # speech activity (for the duck and the levels): 50 ms frames above -40 dBFS
    fr = int(0.05 * SR)
    act = np.repeat([rms(vo[i:i + fr]) > db(-40) for i in range(0, n, fr)], fr)[:n].astype(float)
    speech_rms = rms(vo[act > 0])
    voice_peak = float(np.max(np.abs(vo)))

    # music: ~14 dB under speech RMS, -3 dB duck (fast attack, slow release) while the voice speaks
    mus = music(total)[:n]
    mus *= db(-14) * speech_rms / rms(mus)
    duck = lp(act, 3, 1)  # smoothed activity
    mus *= db(-3 * 1.0) ** np.clip(duck * 1.3, 0, 1)

    sfx = np.zeros(n)

    def oneshot(clip, t0, extra=0.0):
        # peak ~8 dB under the voice peak, and the loudest 100 ms >= 6 dB under the speech RMS
        g = db(-8 + extra) * voice_peak / (np.max(np.abs(clip)) + 1e-9)
        g = min(g, db(-6 + extra) * speech_rms / (max_win(clip) + 1e-9))
        place(sfx, clip * g, t0)

    def bed(clip, t0, under=20):
        place(sfx, clip * db(-under) * speech_rms / rms(clip), t0)

    cues = [
        ("hull crack", lambda: oneshot(hull_crack(), at(ws, "wrecked") - 0.05)),
        ("wind", lambda: bed(wind(3.0), at(ws, "cold") - 0.3)),
        ("hammering", lambda: oneshot(hammering(), at(ws, "built", 1))),
        ("fire", lambda: bed(fire(1.8), at(ws, "cooking") - 0.1, under=18)),
        ("surf", lambda: oneshot(surf(), at(ws, "crawled") - 0.2, extra=-1)),
        ("wind (alone)", lambda: bed(wind(2.0, seed=12), at(ws, "himself") - 0.2)),
        ("saw", lambda: oneshot(saw_strokes(), at(ws, "boat") - 0.1, extra=-2)),
        ("wave crash", lambda: oneshot(wave_crash(), at(ws, "ocean") - 0.2, extra=1)),
        ("wind (survived)", lambda: bed(wind(2.2, seed=14), at(ws, "survived") - 0.2)),
        ("thunder", lambda: oneshot(thunder(), at(ws, "storms") - 0.1, extra=1)),
    ]
    for name, fn in cues:
        fn()
    mix = vo + mus + sfx
    peak = float(np.max(np.abs(mix)))
    if peak > 0.98:
        mix *= 0.98 / peak
    out = ROOT / "out/audio"
    out.mkdir(parents=True, exist_ok=True)
    pre = out / "premaster.wav"
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(pre)], input=pcm, check=True)
    # loudest 100 ms of the SFX outside speech, as a check
    print(f"speech RMS {20*np.log10(speech_rms):.1f} dBFS, voice peak {20*np.log10(voice_peak):.1f} dBFS, "
          f"music RMS {20*np.log10(rms(mus)):.1f} dBFS, sfx loudest 100 ms {20*np.log10(max_win(sfx)):.1f} dBFS, "
          f"{len(cues)} cues, {total:.2f} s")
    print("wrote", pre)


if __name__ == "__main__":
    main()
