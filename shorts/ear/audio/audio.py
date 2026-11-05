# Sound for "Over a Single Ear": an original naval hornpipe score (fife, plucked bass, brass, snare, timpani, glock,
# music box) that follows the story beats, plus synthesized SFX on the picture events (story.ts frames / 30).
# Levels (bridge-short standard): voice unchanged; music bed -10 LU vs the voice, ducked 3 dB under speech;
# SFX events peak at voice -6 dB (momentary max), beds well under. Master: one gain to -15 LUFS + look-ahead limiter
# at -1.2 dBTP. Usage: python3 audio.py  (reads ../voice/voice.mp3 + words_asr.json, writes mix.wav and stems)
import json
import os
import subprocess
import sys
import numpy as np
from scipy import ndimage, signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import (SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, dbg, integrated, momentary_max,
                 true_peak, write_wav, make_ir, convolve_st)
import instruments as I
import sfx_gen as G

FPS = 30
TOTAL = 999
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
TARGET_LUFS = -15.0
CEIL_DB = -1.2
MUSIC_LU = -10.0
DUCK_DB = -3.0
SFX_DB = -6.0

# picture events (frames, from story.ts)
FIRE = [70, 84, 97]
SWING0, STRIKE, POP = 228, 241, 243
EAR_LAND = 265
ROAR = [386, 403]
WON, STING, PAPERS, LAST = 512, 535, 905, 981
CUTS = {108: "cut", 150: "flash", 196: "cut", 262: "crane", 300: "xf", 336: "xf", 384: "cut", 425: "cut", 490: "cut",
        605: "xf", 638: "crane", 684: "cut", 760: "xf", 800: "cut", 850: "cut", 888: "xf", 940: "glide", 962: "glide"}


def load_voice():
    wav = os.path.join(HERE, "voice48.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(HERE, "..", "voice", "voice.mp3"), "-ar", str(SR), "-ac", "2",
                    "-c:a", "pcm_f32le", wav], check=True)
    raw = open(wav, "rb").read()
    i = raw.index(b"data") + 8
    x = np.frombuffer(raw[i:], dtype="<f4").reshape(-1, 2).T.astype(float)
    out = np.zeros((2, N))
    k = min(N, x.shape[1])
    out[:, :k] = x[:, :k]
    return out


def speech_spans(words, merge=0.3):
    sp = []
    for w in words:
        if sp and w["s"] - sp[-1][1] < merge:
            sp[-1][1] = w["e"]
        else:
            sp.append([w["s"], w["e"]])
    return sp


def duck_curve(spans, depth=DUCK_DB, pre=0.08, post=0.12, att=0.07, rel=0.45):
    t = np.arange(N) / SR
    g = np.zeros(N)
    for a, b in spans:
        g[(t >= a - pre) & (t <= b + post)] = 1
    k = int(att * SR)
    g = ndimage.uniform_filter1d(g, 2 * k + 1)
    g = ndimage.maximum_filter1d(g, int(rel * SR))
    g = ndimage.uniform_filter1d(g, int(rel * SR))
    return depth * np.clip(g, 0, 1)


def limiter(x, ceil_db=CEIL_DB, look=0.003, rel=0.08):
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    # release: exponential recovery via a running minimum over a decaying window (vectorised approximation)
    g2 = g1.copy()
    kr = 1 - np.exp(-1 / (rel * SR))
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        g = 1.0
        last = -10**9
        for i in idx:
            if i - last > 1:
                # recover from the previous cluster
                g = min(1.0, 1 - (1 - g) * (1 - kr) ** (i - last))
            g = min(g1[i], g)
            g2[i] = g
            last = i
        # fill release tails after each cluster
        brk = np.flatnonzero(np.diff(idx) > 1)
        for e in np.concatenate([idx[brk], [idx[-1]]]):
            ge = g2[e]
            m = min(n, e + ns(rel * 8))
            tail = 1 - (1 - ge) * (1 - kr) ** np.arange(1, m - e)
            g2[e + 1:m] = np.minimum(g2[e + 1:m], tail)
    g3 = np.minimum(ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest"), 1.0)
    return x * g3[None, :], g3


# ================================================================ music
Q = 60 / 116.0          # quarter note
E8 = Q / 2
F = I.m2f
# original hornpipe in D, 8 bars of 2/4 in eighths (None = rest, (m, k) = note lasting k eighths)
THEME = [[69, 74, 78, 74], [81, 79, 78, 76], [74, 78, 81, 78], [79, 76, 73, 69],
         [71, 74, 79, 83], [81, 78, 74, 78], [76, 79, 78, 76], [(74, 2), None, (74, 2)]]
CHORDS = ["D", "A", "D", "A7", "G", "D", "A7", "D"]
CH = {"D": [50, 57, 62, 66], "A": [45, 52, 57, 61], "A7": [45, 52, 55, 61], "G": [43, 50, 55, 59], "Dm": [50, 57, 62, 65],
      "Bb": [46, 53, 58, 62], "Gm": [43, 50, 55, 58]}


class Band:
    def __init__(self):
        self.tr = {}

    def add(self, name, x, t, p=0.0, g=1.0):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
        x = np.asarray(x, float)
        x = pan(x, p) if x.ndim == 1 else x
        place(self.tr[name], x * g, t)


R = rng(1739)


def roll(b, t0, t1, v0, v1):
    for t, v in I.snare_roll(t0, t1, v0, v1, R):
        b.add("drums", I.snare(v, R, 0.2, buzz=True), t, 0.0)


def add_mono(buf, x, t):
    i = ns(t)
    a, e = max(0, i), min(len(buf), i + len(x))
    if e > a:
        buf[a:e] += x[a - i:e - i]


def theme(b, t0, bars=range(8), inst="fife", vel=0.7, oct=0, bass=True, brass=True, snare=True, gain=1.0):
    for bi in bars:
        tb = t0 + (bi - bars[0]) * 2 * Q
        notes = THEME[bi]
        k = 0
        for nt in notes:
            if nt is None:
                k += 1
                continue
            m, ln = (nt if isinstance(nt, tuple) else (nt, 1))
            t = tb + k * E8
            d = ln * E8 * 0.92
            if inst == "fife":
                b.add("fife", I.fife(F(m + 12 * oct), d, vel * (0.95 if k % 2 else 1.0), R), t, 0.1, gain)
            elif inst == "glock":
                b.add("glock", I.glock(F(m + 12 * oct), vel * 0.8, R, 1.4), t, 0.15, gain)
            elif inst == "box":
                b.add("box", I.musicbox(F(m + 12 * oct), vel * 0.8, R, 1.8), t, -0.1, gain)
            k += ln
        ch = CH[CHORDS[bi]]
        if bass:
            b.add("bass", I.pluck(F(ch[0] - 12 + 12), 0.8, R, 0.5, 0.45), tb, -0.1, gain)
            b.add("bass", I.pluck(F(ch[1] - 12 + 12), 0.6, R, 0.4, 0.45), tb + Q, -0.1, gain)
        if brass:
            for j, m in enumerate(ch[1:]):
                b.add("brass", I.brass(F(m), Q * 0.45, 0.35, R, "horn"), tb + E8, (j - 1) * 0.3, gain)
                b.add("brass", I.brass(F(m), Q * 0.45, 0.3, R, "horn"), tb + Q + E8, (j - 1) * 0.3, gain)
        if snare:
            for s in range(4):
                b.add("drums", I.snare(0.55 if s % 2 else 0.35, R), tb + s * E8, 0.0, gain)


def build_music():
    b = Band()
    # A: hook, full band (0.15 - 5.0)
    t0 = 0.15
    theme(b, t0, range(8), "fife", 0.75)
    for f in FIRE:
        b.add("drums", I.timpani(F(38), 0.9, R, 1.6), fr(f), 0.0)
    b.add("drums", I.cymbal(0.5, R, 2.0), fr(150), 0.0)
    # B: the Rebecca (5.0 - 8.1): lighter theme, anticipation roll into the strike, a stab on the pop
    t1 = fr(150) + 0.05
    theme(b, t1, range(4), "fife", 0.55, brass=False, snare=False)
    roll(b, fr(SWING0), fr(STRIKE), 0.15, 0.7)
    for m in CH["A7"][1:]:
        b.add("brass", I.brass(F(m), 0.5, 0.7, R, "horn"), fr(POP), 0.0)
    b.add("drums", I.cymbal(0.7, R, 1.8), fr(POP), 0.0)
    # tip-toe plucks after the pop (8.3 - 10.0)
    for k, m in enumerate([62, 66, 69, 66, 64, 61, 57, 61, 62, 66, 69, 74]):
        t = fr(POP) + 0.25 + k * E8
        if t < fr(300) - 0.1:
            b.add("bass", I.pluck(F(m), 0.55, R, 0.35, 0.6), t, 0.2)
    # C: "Nobody cared": three sad plucks
    for k, m in enumerate([57, 54, 50]):
        b.add("bass", I.pluck(F(m), 0.6, R, 0.9, 0.35), fr(303) + k * 0.28, 0.0)
    # D: Parliament: roll crescendo to the roar, then the full theme forte, tension, a comic stab on "won"
    roll(b, fr(340), fr(ROAR[0]), 0.1, 0.75)
    for k in range(int((fr(ROAR[0]) - fr(340)) / Q)):
        b.add("brass", I.brass(F(38 + (k % 2) * 7), Q * 0.8, 0.45, R, "tuba"), fr(340) + k * Q, 0.0)
    theme(b, fr(ROAR[0]), range(4), "fife", 0.85, gain=1.1)
    b.add("drums", I.cymbal(0.8, R, 2.4), fr(ROAR[0]), 0.0)
    tt0 = fr(ROAR[0]) + 8 * Q
    k = 0
    while tt0 + k * E8 < fr(WON) - 0.05:
        m = [38, 45, 41, 45][k % 4]
        b.add("bass", I.pluck(F(m + 12), 0.6, R, 0.3, 0.5), tt0 + k * E8, 0.0)
        if k % 4 == 0:
            b.add("drums", I.snare(0.3, R), tt0 + k * E8, 0.0)
        k += 1
    for m in CH["D"]:
        b.add("brass", I.brass(F(m + 12), 0.9, 0.8, R, "horn"), fr(WON), 0.0)
    b.add("drums", I.timpani(F(38), 1.0, R, 1.8), fr(WON), 0.0)
    # E: the sting: the music stops; a low drone holds under "Wait, all that, over an ear?"
    b.add("pad", I.pad([F(38), F(45), F(50), F(53)], fr(605) - fr(STING) + 0.6, 0.6, R, 0.4, 0.8, 600.0), fr(STING), 0.0)
    b.add("drums", I.timpani(F(33), 1.0, R, 2.6), fr(STING), 0.0)
    # F: the night quay: sneaky pizzicato in D minor + glock dots
    k = 0
    line = [50, None, 53, None, 57, 55, 53, None, 50, None, 49, None, 50, 52, 53, None]
    while fr(605) + 0.2 + k * E8 < fr(760) - 0.1:
        m = line[k % 16]
        if m:
            b.add("bass", I.pluck(F(m - 12 + 12), 0.65, R, 0.22, 0.7), fr(605) + 0.2 + k * E8, -0.1)
        if k % 8 == 6:
            b.add("glock", I.glock(F(81 if (k // 8) % 2 else 77), 0.35, R, 1.2), fr(605) + 0.2 + k * E8, 0.3)
        k += 1
    # G: the study: music box, slow theme (bars 1-4 at half speed)
    for bi in range(4):
        for j, nt in enumerate(THEME[bi]):
            if nt is None:
                continue
            m = nt[0] if isinstance(nt, tuple) else nt
            b.add("box", I.musicbox(F(m + 12), 0.5, R, 1.6), fr(760) + 0.2 + (bi * 4 + j) * Q, -0.1)
    b.add("pad", I.pad([F(50), F(57), F(62), F(66)], fr(888) - fr(760), 0.35, R, 0.8, 0.8, 900.0), fr(760), 0.0)
    # H: the museum: pad + glock theme bars 5-8, final chord on the last word
    b.add("pad", I.pad([F(43), F(50), F(55), F(59)], fr(LAST) - fr(888), 0.4, R, 0.6, 0.6, 900.0), fr(888), 0.0)
    for bi in range(4, 7):
        for j, nt in enumerate(THEME[bi]):
            if nt is None:
                continue
            m = nt[0] if isinstance(nt, tuple) else nt
            t = fr(888) + 0.1 + ((bi - 4) * 4 + j) * E8 * 1.6
            if t < fr(LAST) - 0.15:
                b.add("glock", I.glock(F(m + 12), 0.4, R, 1.4), t, 0.15)
    b.add("pad", I.pad([F(50), F(57), F(62), F(66), F(69)], DUR - fr(LAST) + 0.2, 0.6, R, 0.05, 0.4, 1200.0), fr(LAST), 0.0)
    for m in [74, 78, 81, 86]:
        b.add("glock", I.glock(F(m), 0.55, R, 2.0), fr(LAST) + (m - 74) * 0.012, 0.0)
    b.add("drums", I.triangle(0.6, R, 1.6), fr(LAST), 0.0)
    out = sum(b.tr.values())
    room = make_ir(0.9, 11, pre=0.01, hf=1.4)
    out = out + 0.25 * convolve_st(out.mean(0), room)[:, :N]
    # section gains (dB): quiet street, drone, softer study
    t = np.arange(N) / SR
    sec = np.interp(t, [0, 9.9, 10.1, 11.1, 11.3, 17.8, 17.9, 20.1, 20.3, 25.2, 25.4, 29.5, 29.7, DUR],
                    [0, 0, -2, -2, 0, 0, -1, -1, -2, -2, -3, -3, -1, -1])
    return out * dbg(sec)[None, :]


# ================================================================ sfx
EVENTS = []   # (t, x(stereo or mono), extra dB, pan, kind)


def ev(t, x, extra=0.0, p=0.0, kind="event"):
    EVENTS.append((t, x, extra, p, kind))


def cannon(r):
    d = 1.8
    n, t = ns(d), tt(d)
    f = 48 + 40 * np.exp(-t * 12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    body = lp(colored(n, r, -1.0), 380, 2) * np.exp(-t * 4.5) * 3
    crack = hp(r.standard_normal(n), 1400) * np.exp(-t * 45) * 0.5
    return fades(boom + body + crack, 0.001, 0.2)


def pop(r):
    d = 0.18
    t = tt(d)
    f = 900 * np.exp(-t * 18) + 260
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16)
    return fades(y + 0.3 * hp(r.standard_normal(len(t)), 3000) * np.exp(-t * 120), 0.0005, 0.03)


def boing(r, f0=180, d=0.6):
    t = tt(d)
    f = f0 * (1 + 0.35 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 4))
    return fades(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5), 0.002, 0.08)


def scratch(r, d=0.12):
    n = ns(d)
    return fades(bp(r.standard_normal(n), 2500, 7000, 2) * (0.5 + 0.5 * np.sin(np.linspace(0, np.pi, n))), 0.003, 0.02)


def flutter(r, d=0.5):
    n = ns(d)
    m = (0.5 + 0.5 * np.sin(2 * np.pi * 14 * np.arange(n) / SR)) ** 2
    return fades(bp(r.standard_normal(n), 900, 5000, 1) * m, 0.01, 0.1)


def build_sfx():
    r = rng(31)
    # beds
    ev(0.0, G.water_bed(fr(300) + 0.3, rng(2), 0.6, 0.7), -20, 0.0, "bed")
    ev(0.0, G.breeze(fr(300), rng(3), 1.0, 0.2, 900), -26, 0.0, "bed")
    ev(0.0, G.flag_flutter(fr(300), rng(4)), -30, 0.3, "bed")
    ev(fr(300), G.breeze(fr(336) - fr(300), rng(5), 0.8, 0.1, 800), -28, 0.0, "bed")
    ev(fr(340), G.babble(fr(ROAR[0]) - fr(340), rng(6), 130, 1.0), -24, -0.2, "bed")
    ev(fr(340) + 0.1, G.babble(fr(ROAR[0]) - fr(340), rng(7), 200, 1.12), -26, 0.3, "bed")
    ev(fr(605), G.water_bed(fr(760) - fr(605), rng(8), 0.8, 0.5), -22, 0.0, "bed")
    ev(fr(605), G.crickets(fr(760) - fr(605), rng(9), 3), -30, 0.4, "bed")
    ev(fr(888), G.babble(DUR - fr(888), rng(10), 170, 1.1, 3.2, 0.4), -32, 0.0, "bed")
    # whooshes on the big moves and cuts
    for f, kind in CUTS.items():
        d = 0.5 if kind in ("crane", "glide") else 0.32
        ev(fr(f) - d * 0.55, G.whoosh(d, r, peak=0.5, f_lo=300, f_hi=2400), -10 if kind == "xf" else -8, r.uniform(-0.4, 0.4))
    ev(fr(150) - 0.02, I.glock(I.m2f(93), 0.7, r, 1.2), -9, 0.0)
    # broadsides: a boom per gun (2 f ripple), splashes after
    for k, f0 in enumerate(FIRE):
        for i in range(5):
            t = fr(f0 + i * 2)
            ev(t, cannon(r), (0 if i == 0 else -5) - (3 if k == 1 else 0), (i - 2) * 0.2 * (1 if k != 1 else -1))
            if i % 2 == 0:
                ev(t + fr(9), G.splash_big(r), -9, (i - 2) * 0.25)
    ev(fr(127) - 0.03, I.triangle(0.5, r, 1.2), -10, 0.0)   # "ear" on the jar
    # the boarding
    ev(fr(SWING0), G.clink(r, 3300, 0.6, 1.3), -8, 0.3)   # the cutlass rings
    ev(fr(STRIKE) - 0.12, G.whoosh(0.2, r, peak=0.6, f_lo=900, f_hi=5200, width=0.5), -3, 0.2)
    ev(fr(POP), pop(r), 0, -0.1)
    ev(fr(POP) + 0.05, G.oof(r, "oh"), -4, -0.1)
    ev(fr(POP) + 0.2, boing(r, 210, 0.7), -10, -0.2)
    ev(fr(EAR_LAND), G.boot(r, 0.35), -9, -0.3)
    ev(fr(EAR_LAND), boing(r, 330, 0.3), -14, -0.3)
    # street: footsteps of the passers-by
    for i in range(5):
        for k in range(8):
            t = fr(300) + 0.12 * i + k * (0.55 + 0.05 * i)
            if t < fr(336) - 0.05:
                ev(t, G.stroll_step(r, 0.4), -14, (i - 2) * 0.3)
    # Parliament: the roar (twice), applause, papers
    for k, f in enumerate(ROAR):
        n_ = ns(2.2)
        crowd = np.zeros((2, n_))
        for v in range(18):
            h = G.hurrah(r, r.uniform(105, 240), r.uniform(1.0, 1.18))
            place(crowd, pan(lp(h, 3800, 1) * r.uniform(0.4, 1.0), r.uniform(-0.9, 0.9)), r.uniform(0.0, 0.5))
        ev(fr(f), fades(crowd, 0.02, 0.4), -1 if k == 0 else -3, 0.0)
    tt_ = np.arange(ns(2.6)) / SR
    ev(fr(ROAR[0]) + 0.2, G.applause(2.6, r, 36, np.interp(tt_, [0, 0.3, 1.5, 2.6], [0, 1, 0.7, 0])), -8, 0.0)
    for k in range(5):
        ev(fr(ROAR[0]) + 0.3 + k * 0.35, flutter(r, 0.35), -14, r.uniform(-0.6, 0.6))
    # the PM: head-shake swishes, surge thump, "won"
    for k in range(3):
        ev(fr(448) + k * 0.47, G.whoosh(0.18, r, peak=0.5, f_lo=600, f_hi=2600), -16, (-1) ** k * 0.3)
    ev(fr(WON), G.push_thump(r), -4, 0.0)
    ev(fr(WON) + 0.08, G.oof(r, "ugh"), -8, 0.2)
    # the sting: a low hit, then a ting on "ear"
    ev(fr(STING), cannon(r) * 0.6, -3, 0.0)
    ev(fr(589), I.triangle(0.6, r, 1.6), -8, 0.0)
    # night quay: creaks, footsteps, the lantern squeak
    for k in range(4):
        ev(fr(620) + k * 1.1, G.creak(0.7, r, 90, 140), -16, r.uniform(-0.6, 0.6))
    for i in range(5):
        for k in range(9):
            t = fr(684) + 0.1 * i + k * 0.62
            if t < fr(760) - 0.05:
                ev(t, G.stroll_step(r, 0.2), -17, -0.3 + 0.15 * i)
    # the study: quill scratches while he writes, a ting when the title is done
    k = 0
    while fr(823) + k * 0.16 < fr(875):
        ev(fr(823) + k * 0.16 + r.uniform(0, 0.03), scratch(r, r.uniform(0.07, 0.13)), -13, 0.1)
        k += 1
    ev(fr(876), I.glock(I.m2f(88), 0.5, r, 1.4), -10, 0.0)
    # museum: the papers blow away
    for k in range(6):
        ev(fr(PAPERS) + k * 0.1, flutter(r, 0.8), -10, r.uniform(-0.5, 0.5))
    ev(fr(PAPERS) - 0.1, G.breeze(1.6, rng(12), 1.0, 0.5, 1400), -12, 0.0)
    return EVENTS


def main():
    words = json.load(open(os.path.join(HERE, "..", "voice", "words_asr.json")))["words"]
    v = load_voice()
    v_ref = integrated(v)
    print(f"voice {v_ref:.2f} LUFS, TP {true_peak(v):.2f} dBTP")
    m = build_music()
    m = m * dbg(duck_curve(speech_spans(words)))[None, :]
    m = m * dbg(v_ref + MUSIC_LU - integrated(m))
    end = ns(DUR - 0.05)
    m[:, end:] *= np.linspace(1, 0, N - end)[None, :]
    print(f"music {integrated(m) - v_ref:+.2f} LU vs voice")
    s = np.zeros((2, N))
    send = np.zeros(N)
    for t, x, extra, p, kind in build_sfx():
        x = np.asarray(x, float)
        x = pan(x, p) if x.ndim == 1 else x
        cur = momentary_max(x) if kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(v_ref + SFX_DB + extra - cur) if kind == "event" else x * dbg(v_ref + extra - cur)
        place(s, x, t)
        add_mono(send, x.mean(0) * 0.12, t)
    s = s + 0.5 * convolve_st(send, make_ir(1.0, 77, pre=0.01, hf=1.5))[:, :N]
    s = hp(s, 25, 2)
    print(f"sfx {integrated(s) - v_ref:+.2f} LU vs voice (integrated), peak {20*np.log10(np.abs(s).max()+1e-9):.1f} dBFS")
    mix0 = v + m + s
    G0 = TARGET_LUFS - integrated(mix0)
    for it in range(5):
        y, g3 = limiter(mix0 * dbg(G0))
        L = integrated(y)
        if abs(L - TARGET_LUFS) < 0.05:
            break
        G0 += TARGET_LUFS - L
    y = fades(y, 0.0, 0.03)
    print(f"master gain {G0:+.2f} dB -> {integrated(y):.2f} LUFS, TP {true_peak(y):.2f} dBTP, max GR {-20*np.log10(g3.min()):.2f} dB")
    write_wav(os.path.join(HERE, "mix.wav"), y)
    write_wav(os.path.join(HERE, "stem_music.wav"), m * dbg(G0))
    write_wav(os.path.join(HERE, "stem_sfx.wav"), s * dbg(G0))


if __name__ == "__main__":
    main()
