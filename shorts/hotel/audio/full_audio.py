# Full sound for the hotel short (35.0 s): voice unchanged; score: a sleepy music-box lullaby in F (hotel), a light
# curious pizzicato + vibes for the lab, a dreamy pad + harp-like plucks for the brain (a low drone for the guarding
# half), a tiptoe bassoon-ish pluck walk for the night watchman, a gentle ocean wash for the dolphins and ducks, the
# lullaby back for night two and a soft final chord as the lamp goes out. SFX: clock ticks, whooshes on cuts, the
# jolts (boings), EEG beeps, footsteps, lantern creak, waves, quacks, a yawn-slide, the lamp click. Levels as the hook.
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ear", "audio"))
from dsp import SR, ns, rng, lp, hp, colored, fades, pan, place, dbg, integrated, momentary_max, true_peak, write_wav, make_ir, convolve_st
import instruments as I
import sfx_gen as G
import audio as A

FPS, END = 30, 1050
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
    return out

def music():
    out = np.zeros((2, N))
    P = lambda x, t, p=0.0: place(out, pan(x, p) if np.asarray(x).ndim == 1 else x, t)
    lull = [77, 81, 84, 81, 79, 76, 77, 72]
    # hotel hook (0-4.3)
    P(I.pad([F(53), F(60), F(65), F(69)], fr(128), 0.4, R, 0.6, 0.4, 900.0), 0.0)
    for k, m in enumerate(lull):
        t = 0.1 + k * 0.42
        if t < fr(64) - 0.05 or t > fr(98): P(I.musicbox(F(m + 12), 0.45, R, 1.4), t, 0.25 * (-1) ** k)
    P(I.vibes(F(65), 0.5, R, 1.2), fr(64))
    # lab (4.3-9.6 and 19.4-21.8): curious pizzicato + vibes
    for a, b in ((128, 288), (582, 655)):
        t, k = fr(a), 0
        while t < fr(b):
            P(I.pluck(F([60, 64, 67, 72, 67, 64][k % 6]), 0.5, R, 0.4, 0.5), t, 0.2 * (-1) ** k)
            if k % 4 == 0: P(I.vibes(F([72, 76][k // 4 % 2]), 0.25, R, 0.8), t)
            k += 1; t += 0.25
    # brain (9.6-19.4): dreamy pad, harp plucks; a low drone joins when the left half stands guard
    P(I.pad([F(57), F(64), F(69), F(72)], fr(582) - fr(288), 0.45, R, 1.2, 0.6, 1200.0), fr(288))
    for k in range(24): P(I.pluck(F([69, 72, 76, 81, 79, 76][k % 6] + 12), 0.35, R, 0.6, 0.3), fr(290) + 0.38 * k, 0.3 * (-1) ** k)
    P(I.pad([F(45), F(52)], fr(582) - fr(446), 0.5, R, 0.8, 0.4, 400.0), fr(446))
    # night watchman (21.8-26): a tiptoe walk
    for k in range(14): P(I.pluck(F([45, 52, 48, 52][k % 4]), 0.6, R, 0.6, 0.2), fr(658) + 0.3 * k, -0.2)
    for k in range(6): P(I.glock(F([81, 79, 77, 76, 74, 72][k]), 0.2, R, 0.8), fr(722) + 0.5 * k, 0.3)
    # sea (26-28.2): wash of pad + soft vibes
    P(I.pad([F(50), F(57), F(62), F(66)], fr(845) - fr(780), 0.45, R, 0.6, 0.4, 900.0), fr(780))
    for k in range(4): P(I.vibes(F([74, 78, 81, 78][k]), 0.35, R, 1.2), fr(786) + 0.5 * k, 0.2 * (-1) ** k)
    # night two to the end: the lullaby back, then the last chord as the lamp clicks off
    P(I.pad([F(53), F(60), F(65), F(69)], DUR - fr(845), 0.4, R, 1.0, 1.0, 900.0), fr(845))
    for k, m in enumerate(lull * 2):
        t = fr(850) + k * 0.42
        if t < fr(1028): P(I.musicbox(F(m + 12), 0.42, R, 1.4), t, 0.25 * (-1) ** k)
    P(I.pad([F(41), F(53), F(60), F(65), F(69)], DUR - fr(1030), 0.5, R, 0.1, 0.8, 800.0), fr(1030))
    out = out + 0.3 * convolve_st(out.mean(0), make_ir(1.4, 9, pre=0.01, hf=1.2))[:, :N]
    return out

EV = []
def ev(t, x, extra=0.0, p=0.0, kind="event"): EV.append((t, x, extra, p, kind))
def sfx():
    r = rng(9)
    ev(0.0, lp(colored(N, rng(4), -1.0), 400), -27, 0.0, "bed")
    for a, b in ((0, 128), (655, 780), (845, 1040)):
        for t in np.arange(fr(a) + 0.2, fr(b), 0.5): ev(t, G.clink(r, f0=3200 if int(t * 2) % 2 else 2600, dur=0.03, bright=0.6), -23, 0.5)
    for f in (28, 60, 100, 128, 190, 250, 288, 365, 440, 512, 582, 655, 720, 780, 845, 925, 975):
        ev(fr(f) - 0.18, G.whoosh(0.32, r, peak=0.5, f_lo=300, f_hi=2600), -11, r.uniform(-0.3, 0.3))
    ev(fr(64), A.boing(r, 220, 0.5), -6, 0.0)
    for k in range(4): ev(fr(96 + k * 5), A.boing(r, 320 + 40 * k, 0.3), -14, -0.4 + 0.25 * k)
    for t in np.arange(fr(130), fr(288), 0.9): ev(t, G.clink(r, f0=1800, dur=0.06, bright=0.8), -20, 0.4)   # lab monitor pips
    ev(fr(255), G.whoosh(1.0, r, peak=0.5, f_lo=200, f_hi=1500, width=1.0), -12, 0.0)               # time-lapse
    ev(fr(328), I.glock(F(84), 0.5, r, 1.5), -10, 0.0)                                                # "strange"
    for b0 in (522, 540, 556): ev(fr(b0), I.glock(F(93), 0.4, r, 0.25), -6, 0.6); ev(fr(b0 + 8), A.boing(r, 380, 0.25), -12, 0.3)
    for w0 in (600, 626): ev(fr(w0), A.boing(r, 240, 0.45), -6, 0.0); ev(fr(w0) + 0.05, G.whoa(r), -10, 0.0)
    for t in np.arange(fr(660), fr(735), 0.42): ev(t, G.stroll_step(r, 0.3), -20, 0.0)
    ev(fr(745), G.creak(0.4, r, 160, 120), -16, 0.3)
    ev(fr(780), G.water_bed(fr(845) - fr(780), rng(12), 0.5), -18, 0.0, "bed")
    ev(fr(805), G.oof(r, "oof") if hasattr(G, "oof") else G.whoa(r), -18, -0.3)
    ev(fr(868), A.boing(r, 160, 0.8), -12, 0.0)                                                      # the yawn
    for t in np.arange(fr(882), fr(920), 0.42): ev(t, G.stroll_step(r, 0.3), -20, -0.3)
    ev(fr(918), G.clink(r, f0=900, dur=0.1, bright=0.5), -14, -0.6)                                   # the door
    ev(fr(1028), G.clink(r, f0=1400, dur=0.05, bright=0.9), -8, 0.4)                                  # lamp click
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
s = sfx()
mix0 = v + m + s
G0 = A.TARGET_LUFS - integrated(mix0)
for _ in range(5):
    y, g3 = A.limiter(mix0 * dbg(G0))
    L = integrated(y)
    if abs(L - A.TARGET_LUFS) < 0.05: break
    G0 += A.TARGET_LUFS - L
y = fades(y, 0.0, 0.4)
print(f"voice {VREF:.1f} LUFS | music {integrated(m) - VREF:+.1f} LU | out {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP")
write_wav(os.path.join(HERE, "mix.wav"), y)
