# Full sound for "The Cup That Changes Colour" (35.23 s): voice unchanged; an original hushed score in D minor that
# changes with each place (candle room -> vault -> lab -> inside the glass -> workshop); SFX on the picture events.
# Levels as the ear short: music -10 LU vs voice (ducked 3 dB under speech), SFX events at voice -6 dB, beds lower,
# master -15 LUFS, look-ahead limiter at -1.2 dBTP. Writes mix.wav.
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ear", "audio"))
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, pan, place, dbg, integrated, momentary_max, true_peak, write_wav, make_ir, convolve_st
import instruments as I
import sfx_gen as G
import audio as A

FPS, TOTAL = 30, 1057
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
F = I.m2f
R = rng(1600)
BLOW = 1030

def voice():
    wav = os.path.join(HERE, "voice48.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(HERE, "..", "voice", "voice.mp3"), "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", wav], check=True)
    raw = open(wav, "rb").read(); i = raw.index(b"data") + 8
    x = np.frombuffer(raw[i:], dtype="<f4").reshape(-1, 2).T.astype(float)
    out = np.zeros((2, N)); k = min(N, x.shape[1]); out[:, :k] = x[:, :k]
    return out

def music():
    out = np.zeros((2, N))
    def pad(ch, a, b, vel=0.5, warm=800.0, att=0.6, rel=0.6):
        place(out, I.pad([F(m) for m in ch], fr(b) - fr(a), vel, R, att, rel, warm), fr(a))
    # room (0-238): D minor pad + music box; red chord on "blood"
    pad([50, 57, 62, 65], 0, 113, 0.5, 700)
    for k, m in enumerate([74, 77, 81, 79, 77, 74]): place(out, pan(I.musicbox(F(m + 12), 0.45, R, 1.6), 0.2 * (-1) ** k), 0.25 + k * 0.55)
    for k in range(12): place(out, pan(I.glock(F(74 + [0, 3, 7, 10, 12, 15, 19, 22, 24, 27, 31, 34][k]), 0.3 + 0.03 * k, R, 1.2), (k % 2) * 0.4 - 0.2), fr(98) + k * 0.06)
    pad([38, 45, 50, 53, 57], 113, 238, 0.8, 1400, 0.02, 0.6)
    place(out, I.timpani(F(33), 1.0, R, 2.2), fr(113))
    for k, m in enumerate([69, 72, 74]): place(out, I.pluck(F(m), 0.5, R, 0.6, 0.4), fr([156, 188, 215][k]))     # the three denials
    # vault (238-375): slow clock-like plucks speeding up (time passing), a low bell on "nobody"
    for k in range(18): place(out, pan(I.pluck(F(50 + (k % 4) * 3), 0.35, R, 0.4, 0.6), (k % 2) * 0.5 - 0.25), fr(238) + 2.0 * (1 - (1 - k / 18) ** 1.6))
    pad([46, 53, 58, 62], 238, 375, 0.45, 600)
    place(out, I.timpani(F(38), 0.6, R, 2.0), fr(322))
    # lab (375-500): bright arpeggio of discovery, rising into the flash
    pad([50, 54, 57, 62], 375, 500, 0.45, 1500)
    for k in range(16): place(out, pan(I.glock(F([62, 66, 69, 74][k % 4] + 12 * (k // 8)), 0.35, R, 1.0), 0.3 * (-1) ** k), fr(380) + k * 0.24)
    sw = G.whoosh(0.9, R, peak=0.9, f_lo=400, f_hi=7000, width=1.0)
    place(out, pan(sw * 0.5, 0), fr(500) - 0.75)
    # inside the glass (500-796): airy shimmering pad, sparkles; green then red colour in the harmony
    pad([62, 66, 69, 73], 500, 735, 0.5, 2400, 0.1, 0.4)
    pad([50, 53, 57, 62, 65], 735, 796, 0.6, 1600, 0.1, 0.5)
    for k in range(40): place(out, pan(I.glock(F(86 + (k * 5) % 12), 0.18, R, 0.9), np.sin(k) * 0.7), fr(505) + k * 0.2 + 0.05 * np.sin(k * 3))
    # workshop (796-1057): warm low drone, a gentle reprise of the music-box line, last chord on "known"
    pad([38, 45, 50, 57], 796, 1036, 0.5, 600)
    for k, m in enumerate([74, 77, 81, 79, 77, 74, 72, 74]): place(out, pan(I.musicbox(F(m + 12), 0.4, R, 1.6), 0.2 * (-1) ** k), fr(880) + k * 0.6)
    pad([50, 57, 62, 66, 69], 1036, TOTAL, 0.6, 1200, 0.05, 0.6)
    for m in (74, 78, 81, 86): place(out, I.glock(F(m), 0.45, R, 2.0), fr(1036) + (m - 74) * 0.012)
    return out + 0.3 * convolve_st(out.mean(0), make_ir(1.4, 9, pre=0.01, hf=1.2))[:, :N]

EV = []
def ev(t, x, extra=0.0, p=0.0, kind="event"): EV.append((t, x, extra, p, kind))
def crackle(dur, r, rate=0.09):
    n = ns(dur); y = np.zeros(n)
    for t in np.cumsum(r.exponential(rate, int(dur / rate * 1.5) + 4)):
        if t < dur: i = ns(t); m = min(40, n - i); y[i:i + m] += r.uniform(0.3, 1.0) * np.exp(-np.arange(m) / 6) * r.choice([-1, 1])
    return hp(y, 1500) + 0.25 * lp(colored(n, r, -1.0), 300)
def sfx():
    r = rng(7)
    ev(0.0, crackle(fr(238), r), -24, 0.3, "bed")
    ev(0.0, G.crickets(fr(238), rng(3), 2), -34, -0.5, "bed")
    ev(fr(238), G.breeze(fr(375) - fr(238), rng(4), 0.8, 0.3, 500), -26, 0.0, "bed")            # vault air
    n = ns(fr(500) - fr(375)); hum = np.sin(2 * np.pi * 120 * np.arange(n) / SR) * 0.4 + bp(colored(n, r, 0.0), 800, 3000) * 0.2
    ev(fr(375), hum, -30, 0.0, "bed")                                                              # lab hum
    ev(fr(500), G.breeze(fr(796) - fr(500), rng(5), 0.5, 0.6, 2500), -30, 0.0, "bed")               # inside the glass: air
    fur = lp(colored(ns(fr(TOTAL) - fr(796)), r, -1.2), 900) * (1.0 + 0.3 * np.sin(np.arange(ns(fr(TOTAL) - fr(796))) / SR * 2.1))
    ev(fr(796), fur, -24, -0.4, "bed"); ev(fr(796), crackle(fr(TOTAL) - fr(796), r, 0.06), -27, -0.3, "bed")
    for f in (36, 68, 138, 150, 176, 209, 298, 442, 590, 668, 735, 846, 874):
        ev(fr(f) - 0.16, G.whoosh(0.3, r, peak=0.5, f_lo=300, f_hi=2600), -10, r.uniform(-0.3, 0.3))
    for f in (238, 375, 796): ev(fr(f) - 0.3, G.whoosh(0.6, r, peak=0.5, f_lo=200, f_hi=1500), -9, 0.0)   # crossfades
    ev(fr(88), G.whoosh(0.5, r, peak=0.6, f_lo=200, f_hi=1200), -12, 0.3)
    ev(fr(113) - 0.85, G.whoosh(1.0, r, peak=0.85, f_lo=500, f_hi=7000, width=1.0), -5, 0.0)
    ev(fr(113), A.cannon(r) * 0.7, -2, 0.0)
    ev(fr(158), G.clink(r, 2600, 0.4, 0.9), -12, 0.2)                     # a fingernail on the glass
    for k in range(6): ev(fr(184) + k * 0.12, G.clink(r, 1800 + 300 * k, 0.15, 0.5), -16, 0.1)   # shaken, nothing rattles
    ev(fr(216), I.triangle(0.5, r, 1.4), -10, 0.0)                         # "just glass": ting
    for k in range(10): ev(fr(240) + k * 0.2, G.whoosh(0.18, r, peak=0.4, f_lo=600, f_hi=3000), -18, (k % 2) * 0.6 - 0.3)  # time-lapse flicks
    ev(fr(322), G.oof(r, "oh"), -10, 0.0)                                  # the lineup's sigh
    for k in range(3): ev(fr(400) + k * 0.25, np.sin(2 * np.pi * 1800 * tt(0.08)) * np.exp(-tt(0.08) * 30), -14, 0.3)   # console beeps
    ev(fr(500), I.cymbal(0.5, r, 2.0), -6, 0.0)                            # the flash into the glass
    ev(fr(640), G.whoosh(1.1, r, peak=0.5, f_lo=80, f_hi=500), -8, 0.6)    # the hair slides past
    for k in range(8): ev(fr(680) + k * 0.25, G.whoosh(0.12, r, peak=0.3, f_lo=2000, f_hi=8000), -16, 0.5 * np.sin(k))
    for k in range(8): ev(fr(745) + k * 0.22, G.whoosh(0.12, r, peak=0.3, f_lo=1500, f_hi=6000), -16, 0.5 * np.cos(k))
    ev(fr(856), G.oof(r, "oh"), -10, 0.1)                                  # the shrug
    puff = bp(colored(ns(0.35), r, 0.0), 300, 2500) * np.exp(-tt(0.35) * 9)
    ev(fr(BLOW), puff, -6, 0.1)                                            # blowing the candle out
    out = np.zeros((2, N))
    for t, x, extra, p, kind in EV:
        x = np.asarray(x, float); x = pan(x, p) if x.ndim == 1 else x
        cur = momentary_max(x) if kind == "event" else integrated(x)
        tgt = (VREF + A.SFX_DB + extra) if kind == "event" else (VREF + extra)
        if np.isfinite(cur): x = x * dbg(tgt - cur)
        place(out, x, t)
    return hp(out, 25, 2)

v = voice(); VREF = integrated(v)
words = json.load(open(os.path.join(HERE, "..", "voice", "words_asr.json")))["words"]
A.N = N
m = music() * dbg(A.duck_curve(A.speech_spans(words)))[None, :]
m = m * dbg(VREF + A.MUSIC_LU - integrated(m))
end = ns(DUR - 0.06); m[:, end:] *= np.linspace(1, 0, N - end)[None, :]
s = sfx()
mix0 = v + m + s
G0 = A.TARGET_LUFS - integrated(mix0)
for _ in range(5):
    y, g3 = A.limiter(mix0 * dbg(G0))
    L = integrated(y)
    if abs(L - A.TARGET_LUFS) < 0.05: break
    G0 += A.TARGET_LUFS - L
y = fades(y, 0.0, 0.04)
print(f"voice {VREF:.1f} LUFS | music {integrated(m) - VREF:+.1f} LU | out {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP")
write_wav(os.path.join(HERE, "mix.wav"), y)
