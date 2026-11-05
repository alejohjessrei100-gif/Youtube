# Full sound for the Vasa short (39.0 s): voice unchanged; an original score in sections (brass fanfare that deflates
# -> a pompous little royal march for the king -> a tense ticking ostinato through the stability test, cut dead on
# "stopped" -> a comic fanfare sting on "sailed anyway" -> D minor storm with timpani for the gusts and the flooding ->
# a light "diagram" pluck motif with stones pouring -> deep underwater pad, a rising swell on "raised it" -> a bright
# chord for 1961 -> a gentle music-box button in the museum); SFX timed to the picture. Levels as the hook: music -10
# LU vs voice (ducked 3 dB under speech), SFX events at voice -6 dB, master -15 LUFS, limiter -1.2 dBTP.
import json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ear", "audio"))
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, fades, pan, place, dbg, integrated, momentary_max, true_peak, write_wav, make_ir, convolve_st
import instruments as I
import sfx_gen as G
import audio as A

FPS, END = 30, 1170
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
    return out

def music():
    out = np.zeros((2, N))
    P = lambda x, t, p=0.0: place(out, pan(x, p) if np.asarray(x).ndim == 1 else x, t)
    # 0-5.6: fanfare (as the hook), deflating on "breeze"
    q = 0.36; notes = [(62, 1), (66, 1), (69, 1), (74, 2), (69, 1), (74, 1), (78, 3)]
    for k, (m, d) in enumerate(notes):
        t = 0.05 + sum(dd for _, dd in notes[:k]) * q
        if t < fr(130): P(I.brass(F(m), d * q * 0.9, 0.8, R, "horn"), t, 0.15)
    for t in np.arange(0.05, fr(130), 2 * q): P(I.brass(F(38), q * 1.6, 0.7, R, "tuba"), t, -0.1)
    P(I.pad([F(50), F(57), F(62), F(66)], fr(132), 0.45, R, 0.3, 0.3, 1200.0), 0.0)
    for t in np.arange(fr(44), fr(67), 1 / 28): P(I.snare(0.25 + 0.6 * (t - fr(44)) / fr(23), R, 0.12), t, 0.1)
    P(I.timpani(F(38), 1.0, R, 2.0), fr(67)); P(I.cymbal(0.8, R, 2.2), fr(67))
    for k in range(3): P(I.brass(F([74, 78, 81][k]), 0.2, 0.9, R, "stab"), fr(97) + k * 0.12, 0.2)
    for k, m in enumerate([57, 56, 55]): P(I.brass(F(m), 0.28, 0.7, R, "soft", scoop=-10), fr(136) + k * 0.3)
    P(I.brass(F(54), 0.8, 0.7, R, "soft", fall=-5.0), fr(136) + 0.9)
    # 5.7-10.5: royal march for the king (G major, oom-pah + a pompous tune)
    b = 60 / 112
    for k in range(9):
        t = fr(172) + k * b
        if t > fr(312): break
        P(I.brass(F(43 if k % 2 == 0 else 50), b * 0.45, 0.7, R, "tuba"), t, -0.15)
        P(I.snare(0.35, R, 0.1), t + b / 2, 0.15)
    tune = [(67, 1), (71, 0.5), (74, 0.5), (79, 1.5), (78, 0.5), (76, 1), (74, 1), (79, 2)]
    t = fr(178)
    for m, d in tune: P(I.brass(F(m), d * b * 0.9, 0.7, R, "horn"), t, 0.2); t += d * b
    P(I.timpani(F(43), 0.8, R, 1.6), fr(W_TERR)); P(I.brass(F(55), 0.6, 0.8, R, "stab", fall=-2), fr(W_TERR))
    # 10.5-16.8: the test: a ticking pizzicato ostinato in D minor that tightens each run; cut dead on "stopped"
    t, step = fr(316), 0.3
    seq = [50, 57, 53, 57]
    k = 0
    while t < fr(507):
        P(I.pluck(F(seq[k % 4]), 0.6, R, 0.4, 0.4), t, 0.1 * (-1) ** k)
        if k % 2 == 0: P(I.glock(F(86), 0.12, R, 0.3), t, 0.3)
        k += 1; t += step * (0.85 if t > fr(412) else 1.0) * (0.85 if t > fr(446) else 1.0)
    P(I.pad([F(38), F(45), F(50), F(53)], fr(505) - fr(316), 0.35, R, 1.0, 0.05, 700.0), fr(316))
    for t0 in (fr(395), fr(432), fr(468)): P(I.timpani(F(38), 0.6 + 0.2 * (t0 > fr(460)), R, 1.2), t0)
    # 18.0-19.2: "and sailed anyway": a cheeky fanfare sting (D major)
    for k, m in enumerate([62, 66, 69, 74]): P(I.brass(F(m), 0.14, 0.85, R, "stab"), fr(551) + k * 0.09, 0.15)
    P(I.brass(F(74), 0.55, 0.9, R, "horn"), fr(562)); P(I.cymbal(0.5, R, 1.4), fr(562))
    # 19.4-26.0: the storm: D minor pad swelling, timpani rolls on the gusts, low brass on "ports" and "out"
    P(I.pad([F(38), F(45), F(50), F(53), F(57)], fr(776) - fr(582), 0.6, R, 0.8, 0.3, 900.0), fr(582))
    for g0, v in ((593, 0.6), (642, 0.95)):
        for t in np.arange(fr(g0) - 0.5, fr(g0) + 0.4, 1 / 18): P(I.timpani(F(38), v * 0.5 * (0.5 + (t - fr(g0) + 0.5)), R, 0.4), t)
    for f0, m in ((698, 41), (725, 40), (761, 38)): P(I.brass(F(m), 0.9, 0.9, R, "tuba", fall=-1.0), fr(f0), -0.1)
    # 25.9-30.4: the cutaway: a light plucked "diagram" motif; a sinking slide on "dropped", two warning notes at "waterline"
    t = fr(780); motif = [62, 65, 69, 65, 62, 65, 69, 72]
    k = 0
    while t < fr(912):
        P(I.pluck(F(motif[k % 8] + (0 if t < fr(846) else -2)), 0.45, R, 0.5, 0.6), t, 0.2 * (-1) ** k); k += 1; t += 0.25
    for k in range(6): P(I.vibes(F(74 - 2 * k), 0.4, R, 0.5), fr(853) + 0.16 * k)
    for k in range(2): P(I.brass(F(51), 0.3, 0.7, R, "stab"), fr(892) + 0.32 * k)
    # 30.4-33.8: underwater: a deep slow pad, a rising swell into "raised it"
    P(I.pad([F(33), F(40), F(45), F(48)], fr(1014) - fr(908), 0.5, R, 1.5, 0.4, 500.0), fr(908))
    for k in range(10): P(I.glock(F([69, 72, 76, 81][k % 4]), 0.15, R, 1.5), fr(915) + 0.33 * k, 0.4 * (-1) ** k)
    P(I.pad([F(50), F(57), F(62), F(66), F(69)], 0.9, 0.5, R, 0.8, 0.2, 1400.0), fr(988))
    # 33.8-35.5: 1961: a bright chord + brass
    P(I.pad([F(50), F(57), F(62), F(66), F(74)], fr(1064) - fr(1014), 0.6, R, 0.05, 0.3, 1800.0), fr(1014))
    for k, m in enumerate([74, 78, 81, 86]): P(I.brass(F(m), 0.18, 0.8, R, "stab"), fr(1014) + 0.1 * k, 0.2)
    P(I.cymbal(0.6, R, 1.8), fr(1014))
    # 35.5-39: the museum: a gentle music-box button, the fanfare's first three notes, then a last chord
    for k, m in enumerate([74, 78, 81, 78, 86, 85, 81]): P(I.musicbox(F(m + 12), 0.5, R, 1.6), fr(1068) + k * 0.42, 0.25 * (-1) ** k)
    P(I.pad([F(50), F(57), F(62), F(66)], DUR - fr(1064), 0.4, R, 1.0, 0.8, 1000.0), fr(1064))
    for k, m in enumerate([62, 66, 69]): P(I.brass(F(m), 0.3, 0.6, R, "soft"), fr(1140) + 0.28 * k, 0.1)
    P(I.brass(F(74), 0.9, 0.6, R, "soft"), fr(1140) + 0.84)
    out = out + 0.25 * convolve_st(out.mean(0), make_ir(1.6, 9, pre=0.01, hf=1.2))[:, :N]
    return out
W_TERR = 271

EV = []
def ev(t, x, extra=0.0, p=0.0, kind="event"): EV.append((t, x, extra, p, kind))
def bed(a, b, x, extra, p=0.0):
    x = np.asarray(x, float); n = x.shape[-1]; k = min(n, ns(b - a))
    y = x[..., :k] * np.minimum(1, np.minimum(np.arange(k) / ns(0.15), (k - np.arange(k)) / ns(0.25)))
    ev(a, y, extra, p, "bed")
def sfx():
    r = rng(9)
    # beds by place
    bed(0, fr(780), G.water_bed(fr(780), rng(4), 0.6), -20)
    bed(0, fr(780), G.breeze(fr(780), rng(5), 0.6), -28)
    bed(0, fr(560), G.flag_flutter(fr(560), rng(6)), -30, 0.4)
    bed(fr(908), fr(1014), G.bubbles(fr(1014) - fr(908), rng(7), 6.0), -18)
    bed(fr(908), fr(1014), lp(colored(ns(fr(1014) - fr(908)), rng(8), -1.0), 300), -24)
    bed(fr(1014), fr(1064), G.water_bed(fr(1064) - fr(1014), rng(10), 1.0), -20)
    bed(fr(1060), DUR, lp(colored(ns(DUR - fr(1060)), rng(12), -1.0), 500), -30)
    bed(fr(1060), DUR, G.babble(DUR - fr(1060), rng(13), 150, 1.0), -32)
    # cuts
    for f in (22, 46, 96, 130, 170, 238, 280, 316, 410, 492, 542, 560, 582, 636, 700, 746, 780, 848, 912, 988, 1014, 1064, 1114):
        ev(fr(f) - 0.18, G.whoosh(0.32, r, peak=0.5, f_lo=300, f_hi=2600), -10, r.uniform(-0.3, 0.3))
    # hook (as the hook test)
    ev(fr(4), G.creak(0.7, r, 90, 140), -16, -0.3)
    for d in (0, 1):
        for k in range(12):
            t = fr(50 + (11 - k) * 2.6 + d * 5)
            ev(t, G.clink(r, f0=r.uniform(380, 520), dur=0.08, bright=0.4), -16 + k * 0.3, 0.3 - 0.05 * k)
            ev(t + 0.12, lp(G.rattle(0.35, r, density=60, heavy=True), 900), -14, 0.2 - 0.04 * k)
    ev(fr(96), G.applause(1.2, rng(11), 30), -8, 0.0)
    for k in range(6): ev(fr(98) + 0.12 * k, G.hurrah(r, r.uniform(110, 230), r.uniform(0.9, 1.3), kid=k == 4), -12, r.uniform(-0.6, 0.6))
    ev(fr(126), G.whoosh(0.7, r, peak=0.4, f_lo=500, f_hi=5000, width=1.0), -6, -0.5)
    ev(fr(141), G.creak(0.9, r, 70, 40, scale=1.4), -8, 0.2)
    ev(fr(143), G.whoa(r), -6, -0.2)
    # the king's footsteps on the pier
    for t in np.arange(fr(172), fr(238), 0.46): ev(t, G.stroll_step(r, 0.4), -18, 0.0)
    ev(fr(288), G.whoa(r, base=200), -10, 0.3)                                     # the spies gasp
    # the runs: boots drumming, the hull groaning at each roll
    for a, b2, _ in [(373, 399, 0), (412, 437, 0), (446, 470, 0)]:
        for t in np.arange(fr(a), fr(b2), 1 / 9): ev(t + r.uniform(0, 0.04), G.boot(r, 0.6), -17, r.uniform(-0.5, 0.5))
    for f0, s in ((402, 1.0), (440, 1.2), (474, 1.6)): ev(fr(f0), G.creak(0.8 + 0.3 * s, r, 80, 45, scale=s), -10 + 2 * s, 0.1)
    ev(fr(511), G.whoa(r, base=120), -6, 0.0)
    ev(fr(546), I.brass(F(50), 0.35, 0.6, r, "soft", fall=-3.0), -12, 0.0)          # the shrug
    ev(fr(560), G.applause(1.0, rng(14), 30), -9, 0.0)
    for k in range(4): ev(fr(561) + 0.15 * k, G.hurrah(r, r.uniform(110, 230), 1.0), -13, r.uniform(-0.6, 0.6))
    # the gusts, the roll, the flooding
    for g0, s in ((593, 1.0), (642, 1.5)):
        ev(fr(g0) - 0.4, G.whoosh(0.9, r, peak=0.5, f_lo=300, f_hi=4500, width=1.0), -5 + 2 * s, -0.4)
        ev(fr(g0) + 0.3, G.creak(1.0 * s, r, 70, 35, scale=1.2 * s), -9 + 2 * s, 0.2)
    ev(fr(700), G.splash_big(r), -4, 0.0)
    for k in range(5): ev(fr(705) + 0.25 * k, G.bubbles(0.6, r, 30), -12, r.uniform(-0.5, 0.5))
    ev(fr(746), G.timber_tear(r, 1.0), -8, 0.0)
    for k in range(3): ev(fr(752) + 0.3 * k, G.whoa(r), -14, r.uniform(-0.6, 0.6))
    # the cutaway: rocking ticks, stones pouring, sinking bloop
    for k in range(4): ev(fr(780) + k * (38 / 30) / 2, G.creak(0.4, r, 120, 90), -16, (-1) ** k * 0.4)
    ev(fr(814), lp(G.rattle(fr(846) - fr(814), r, density=90, heavy=True), 2500), -6, 0.0)
    for k in range(18): ev(fr(814) + k * 0.06, G.clink(r, f0=r.uniform(200, 400), dur=0.1, bright=0.3), -14, r.uniform(-0.4, 0.4))
    ev(fr(853), G.bubbles(1.2, r, 12), -10, 0.0)
    # under the sea: cable strain, mud rumble, a surge to the surface
    ev(fr(975), G.bolt_strain(r, 1.0, 0.6), -10, 0.3)
    ev(fr(990), lp(colored(ns(1.2), r, -2.0), 160), -6, 0.0)
    ev(fr(1008), G.whoosh(0.8, r, peak=0.7, f_lo=200, f_hi=3000, width=1.0), -6, 0.0)
    # 1961: cheering and flashbulbs
    ev(fr(1014), G.applause(1.6, rng(15), 40), -8, 0.0)
    for k in range(5): ev(fr(1016) + 0.14 * k, G.hurrah(r, r.uniform(110, 230), 1.0), -13, r.uniform(-0.6, 0.6))
    for k in range(6): ev(fr(1018) + 0.27 * k, A.pop(r), -14, r.uniform(-0.6, 0.6))
    # the museum: a camera shutter + flash whine on "capsule"
    ev(fr(1140), G.clink(r, f0=2400, dur=0.05, bright=1.0), -10, 0.3); ev(fr(1140) + 0.06, A.scratch(r, 0.05), -14, 0.3)
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
y = fades(y, 0.0, 0.3)
print(f"voice {VREF:.1f} LUFS | music {integrated(m) - VREF:+.1f} LU | out {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP")
write_wav(os.path.join(HERE, "mix.wav"), y)
