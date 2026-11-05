# Sound for the Vasa short's hook (0-5.6 s): voice unchanged; a proud brass fanfare in D (horns + tuba, snare roll,
# timpani on "cannons") that deflates into a comic falling trombone on "breeze"; harbour water, flag flutter, wood
# creaks, whooshes on the cuts, a ripple of gun-port lids clacking open + guns rumbling out, the crowd's cheer, the gust
# and a sailor's "whoa". Levels as the cup / ear shorts: music -10 LU vs voice (ducked 3 dB under speech), SFX events at
# voice -6 dB, master -15 LUFS, limiter -1.2 dBTP.
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ear", "audio"))
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, pan, place, dbg, integrated, momentary_max, true_peak, write_wav, make_ir, convolve_st
import instruments as I
import sfx_gen as G
import audio as A

FPS, END = 30, 169
DUR = END / FPS
N = ns(DUR)
fr = lambda f: f / FPS
F = I.m2f
R = rng(1628)

def voice():
    wav = os.path.join(HERE, "voice48.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(HERE, "..", "voice", "voice.mp3"), "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", wav], check=True)
    raw = open(wav, "rb").read(); i = raw.index(b"data") + 8
    x = np.frombuffer(raw[i:], dtype="<f4").reshape(-1, 2).T.astype(float)
    out = np.zeros((2, N)); k = min(N, x.shape[1]); out[:, :k] = x[:, :k]
    out[:, ns(5.45):] *= np.linspace(1, 0, N - ns(5.45))[None, :] ** 2   # "You see" starts at 5.62 s
    return out

def music():
    out = np.zeros((2, N))
    # fanfare: D major, a rising call on the horns over a tuba pedal, snare roll building to "cannons"
    q = 0.36
    for k, (m, d) in enumerate([(62, 1), (66, 1), (69, 1), (74, 2), (69, 1), (74, 1), (78, 3)]):
        t = 0.05 + sum(dd for _, dd in [(62, 1), (66, 1), (69, 1), (74, 2), (69, 1), (74, 1), (78, 3)][:k]) * q
        if t < fr(130): place(out, pan(I.brass(F(m), d * q * 0.9, 0.8, R, "horn"), 0.15), t)
    for t in np.arange(0.05, fr(130), 2 * q): place(out, pan(I.brass(F(38), q * 1.6, 0.7, R, "tuba"), -0.1), t)
    place(out, I.pad([F(50), F(57), F(62), F(66)], fr(132), 0.45, R, 0.3, 0.3, 1200.0), 0.0)
    for t in np.arange(fr(44), fr(67), 1 / 28): place(out, pan(I.snare(0.25 + 0.6 * (t - fr(44)) / fr(23), R, 0.12), 0.1), t)
    place(out, I.timpani(F(38), 1.0, R, 2.0), fr(67)); place(out, I.cymbal(0.8, R, 2.2), fr(67))
    for k in range(3): place(out, pan(I.brass(F([74, 78, 81][k]), 0.2, 0.9, R, "stab"), 0.2), fr(97) + k * 0.12)
    # deflation: a sad trombone slide on "breeze"
    for k, m in enumerate([57, 56, 55]): place(out, I.brass(F(m), 0.28, 0.7, R, "soft", scoop=-10), fr(136) + k * 0.3)
    place(out, I.brass(F(54), 0.8, 0.7, R, "soft", fall=-5.0), fr(136) + 0.9)
    out = out + 0.25 * convolve_st(out.mean(0), make_ir(1.6, 9, pre=0.01, hf=1.2))[:, :N]
    return out

EV = []
def ev(t, x, extra=0.0, p=0.0, kind="event"): EV.append((t, x, extra, p, kind))
def sfx():
    r = rng(9)
    ev(0.0, G.water_bed(DUR, rng(4), 0.6), -20, 0.0, "bed")
    ev(0.0, G.breeze(DUR, rng(5), 0.6), -28, 0.0, "bed")
    ev(0.0, G.flag_flutter(DUR, rng(6)), -30, 0.4, "bed")
    for f in (22, 46, 96, 130):
        ev(fr(f) - 0.18, G.whoosh(0.32, r, peak=0.5, f_lo=300, f_hi=2600), -9, r.uniform(-0.3, 0.3))
    ev(fr(4), G.creak(0.7, r, 90, 140), -16, -0.3)
    # the lids: a ripple of wooden clacks, each gun rumbling out behind it
    for d in (0, 1):
        for k in range(12):
            t = fr(50 + (11 - k) * 2.6 + d * 5)
            ev(t, G.clink(r, f0=r.uniform(380, 520), dur=0.08, bright=0.4), -16 + k * 0.3, 0.3 - 0.05 * k)
            ev(t + 0.12, lp(G.rattle(0.35, r, density=60, heavy=True), 900), -14, 0.2 - 0.04 * k)
    ev(fr(96), G.applause(1.2, rng(11), 30), -8, 0.0)
    for k in range(6): ev(fr(98) + 0.12 * k, G.hurrah(r, r.uniform(110, 230), r.uniform(0.9, 1.3), kid=k == 4), -12, r.uniform(-0.6, 0.6))
    ev(fr(126), G.whoosh(0.7, r, peak=0.4, f_lo=500, f_hi=5000, width=1.0), -6, -0.5)   # the gust
    ev(fr(141), G.creak(0.9, r, 70, 40, scale=1.4), -8, 0.2)                          # the hull leans
    ev(fr(143), G.whoa(r), -6, -0.2)
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
y = fades(y, 0.0, 0.08)
print(f"voice {VREF:.1f} LUFS | music {integrated(m) - VREF:+.1f} LU | out {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP")
write_wav(os.path.join(HERE, "hook_mix.wav"), y)
