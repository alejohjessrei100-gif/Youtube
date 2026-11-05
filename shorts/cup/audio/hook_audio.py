# Sound for the cup short's hook (0-5 s): voice unchanged; a hushed music bed in D minor (pad + music box), candle
# crackle and room tone, whooshes on the cuts, a rising glass shimmer while the cup turns red, a low hit + red chord on
# "blood red". Levels as the ear short: music -10 LU vs voice (ducked 3 dB under speech), SFX events at voice -6 dB,
# master -15 LUFS, limiter -1.2 dBTP.
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ear", "audio"))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ear", "audio"))
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, pan, place, dbg, integrated, momentary_max, true_peak, write_wav, make_ir, convolve_st
import instruments as I
import sfx_gen as G
import audio as A  # the ear short's mix helpers (limiter, ducking, speech spans)

FPS, END = 30, 150
DUR = END / FPS
N = ns(DUR)
fr = lambda f: f / FPS
F = I.m2f
R = rng(1600)

def voice():
    wav = os.path.join(HERE, "voice48.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(HERE, "..", "voice", "voice.mp3"), "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", wav], check=True)
    raw = open(wav, "rb").read(); i = raw.index(b"data") + 8
    x = np.frombuffer(raw[i:], dtype="<f4").reshape(-1, 2).T.astype(float)
    out = np.zeros((2, N)); k = min(N, x.shape[1]); out[:, :k] = x[:, :k]
    out[:, ns(4.93):] *= np.linspace(1, 0, N - ns(4.93))[None, :] ** 2   # the next word ("No") starts at 5.0 s
    return out

def music():
    out = np.zeros((2, N))
    place(out, I.pad([F(50), F(57), F(62), F(65)], DUR, 0.5, R, 0.8, 0.6, 700.0), 0.0)
    for k, m in enumerate([74, 77, 81, 79, 77, 74]):
        t = 0.25 + k * 0.55
        if t < fr(100): place(out, pan(I.musicbox(F(m + 12), 0.45, R, 1.6), 0.2 * (-1) ** k), t)
    # rising shimmer while the glass turns red, then the red chord
    for k in range(12):
        t = fr(98) + k * 0.06
        place(out, pan(I.glock(F(74 + [0, 3, 7, 10, 12, 15, 19, 22, 24, 27, 31, 34][k]), 0.3 + 0.03 * k, R, 1.2), (k % 2) * 0.4 - 0.2), t)
    place(out, I.pad([F(38), F(45), F(50), F(53), F(57)], DUR - fr(113) + 0.3, 0.9, R, 0.02, 0.5, 1400.0), fr(113))
    place(out, pan(I.timpani(F(33), 1.0, R, 2.2), 0.0), fr(113))
    out = out + 0.3 * convolve_st(out.mean(0), make_ir(1.4, 9, pre=0.01, hf=1.2))[:, :N]
    return out

EV = []
def ev(t, x, extra=0.0, p=0.0, kind="event"): EV.append((t, x, extra, p, kind))
def sfx():
    r = rng(7)
    n = ns(DUR)
    crackle = np.zeros(n)
    for t in np.cumsum(r.exponential(0.09, 120)):
        if t < DUR: i = ns(t); crackle[i:i + 40] += r.uniform(0.3, 1.0) * np.exp(-np.arange(min(40, n - i)) / 6) * r.choice([-1, 1])
    ev(0.0, hp(crackle, 1500) + 0.25 * lp(colored(n, r, -1.0), 300), -24, 0.3, "bed")
    ev(0.0, G.crickets(DUR, rng(3), 2), -34, -0.5, "bed")
    for f in (36, 68, 138):
        ev(fr(f) - 0.18, G.whoosh(0.32, r, peak=0.5, f_lo=300, f_hi=2600), -9, r.uniform(-0.3, 0.3))
    ev(fr(88), G.whoosh(0.5, r, peak=0.6, f_lo=200, f_hi=1200), -12, 0.3)   # the flame swings in behind the glass
    sw = G.whoosh(1.0, r, peak=0.85, f_lo=500, f_hi=7000, width=1.0)           # reverse swell into the hit
    ev(fr(113) - 0.85, sw, -5, 0.0)
    ev(fr(113), A.cannon(r) * 0.7, -2, 0.0)
    ev(fr(138), I.triangle(0.5, r, 1.4), -12, 0.0)
    out = np.zeros((2, N))
    for t, x, extra, p, kind in EV:
        x = np.asarray(x, float); x = pan(x, p) if x.ndim == 1 else x
        cur = momentary_max(x) if kind == "event" else integrated(x)
        tgt = (VREF + A.SFX_DB + extra) if kind == "event" else (VREF + extra)
        if np.isfinite(cur): x = x * dbg(tgt - cur)
        place(out, x, t)
    return hp(out, 25, 2)

v = voice(); VREF = integrated(v)
words = [w for w in json.load(open(os.path.join(HERE, "..", "voice", "words_asr.json")))["words"] if w["s"] < DUR]
A.N = N
m = music() * dbg(A.duck_curve(A.speech_spans(words)))[None, :]
m = m * dbg(VREF + A.MUSIC_LU - integrated(m))
s = sfx()
mix0 = v + m + s
G0 = A.TARGET_LUFS - integrated(mix0)
for _ in range(5):
    y, g3 = A.limiter(mix0 * dbg(G0))
    L = integrated(y)
    if abs(L - A.TARGET_LUFS) < 0.05: break
    G0 += A.TARGET_LUFS - L
y = fades(y, 0.0, 0.05)
print(f"voice {VREF:.1f} LUFS | music {integrated(m) - VREF:+.1f} LU | out {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP")
write_wav(os.path.join(HERE, "hook_mix.wav"), y)
