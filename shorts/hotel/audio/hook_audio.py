# Sound for the hotel short's hook (0-4.27 s): voice unchanged; a sleepy music-box lullaby in F with a soft pad, room
# tone + distant city hum, a clock ticking, whooshes on the cuts, a cartoon "boing" + gasp when he jolts upright, soft
# boings as the sheep vault the bed. Levels as the other shorts: music -10 LU vs voice (ducked 3 dB under speech), SFX
# events at voice -6 dB, master -15 LUFS, limiter -1.2 dBTP.
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ear", "audio"))
from dsp import SR, ns, rng, lp, hp, colored, fades, pan, place, dbg, integrated, momentary_max, true_peak, write_wav, make_ir, convolve_st
import instruments as I
import sfx_gen as G
import audio as A

FPS, END = 30, 128
DUR = END / FPS
N = ns(DUR)
fr = lambda f: f / FPS
F = I.m2f
R = rng(316)

def voice():
    wav = os.path.join(HERE, "voice48.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(HERE, "..", "voice", "voice.mp3"), "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", wav], check=True)
    raw = open(wav, "rb").read(); i = raw.index(b"data") + 8
    x = np.frombuffer(raw[i:], dtype="<f4").reshape(-1, 2).T.astype(float)
    out = np.zeros((2, N)); k = min(N, x.shape[1]); out[:, :k] = x[:, :k]
    out[:, ns(4.05):] *= np.linspace(1, 0, N - ns(4.05))[None, :] ** 2   # "You see" starts at 4.23 s
    return out

def music():
    out = np.zeros((2, N))
    place(out, I.pad([F(53), F(60), F(65), F(69)], DUR, 0.4, R, 0.6, 0.4, 900.0), 0.0)
    for k, m in enumerate([77, 81, 84, 81, 79, 76, 77, 72]):
        t = 0.1 + k * 0.42
        if t < fr(SIT := 64) - 0.05 or t > fr(98): place(out, pan(I.musicbox(F(m + 12), 0.45, R, 1.4), 0.25 * (-1) ** k), t)
    place(out, I.vibes(F(65), 0.5, R, 1.2), fr(64))
    out = out + 0.3 * convolve_st(out.mean(0), make_ir(1.4, 9, pre=0.01, hf=1.2))[:, :N]
    return out

EV = []
def ev(t, x, extra=0.0, p=0.0, kind="event"): EV.append((t, x, extra, p, kind))
def sfx():
    r = rng(9)
    ev(0.0, lp(colored(N, rng(4), -1.0), 400), -26, 0.0, "bed")                     # room tone / city hum
    for t in np.arange(0.2, DUR, 0.5): ev(t, G.clink(r, f0=3200 if int(t * 2) % 2 else 2600, dur=0.03, bright=0.6), -22, 0.5)  # clock tick
    for f in (28, 60, 100): ev(fr(f) - 0.18, G.whoosh(0.32, r, peak=0.5, f_lo=300, f_hi=2600), -10, r.uniform(-0.3, 0.3))
    ev(fr(64), A.boing(r, 220, 0.5), -6, 0.0)
    ev(fr(65), G.oof(r, "gasp") if hasattr(G, "oof") else G.whoa(r), -8, 0.0)
    for k in range(4): ev(fr(96 + k * 5), A.boing(r, 320 + 40 * k, 0.3), -14, -0.4 + 0.25 * k)
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
