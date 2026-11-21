# Sound for "Before Alarm Clocks" (the knocker-upper): sparse, varied effects under the voice, a quiet bed per place
# (the music bed is added afterwards, ducked under the voice). Taps on the glass follow the pole's tap cycle (2.6/s).
import sys, os, json
sys.path.insert(0, os.path.expanduser("~/cartoon-3d-short-kit/templates/audio"))
import numpy as np
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, modal, colored, smooth_noise, momentary_max, integrated, read_wav, write_wav, true_peak
import sfx_gen as G

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.path.expanduser("~/knock-short/voice/clean.wav")
DUR = 1476 / 30
N = ns(DUR)
SFX_DB = -6.0
R = rng(3100)


def mono(x):
    x = np.asarray(x, float); return x if x.ndim == 1 else x.mean(0)


def tick_bed(dur, r, n=5):  # a shop full of clocks: several ticks at slightly different rates
    y = np.zeros(ns(dur))
    for k in range(n):
        rate = 1.0 + 0.13 * k + 0.05 * r.uniform(); t0 = r.uniform(0, 0.5); f = 2600 + 700 * r.uniform()
        while t0 < dur - 0.05:
            c = G.clink(r, f + (300 if int(t0 * rate) % 2 else 0), 0.03, 0.6) * (0.5 + 0.1 * k); i = ns(t0); y[i:i + len(c)] += c[: len(y) - i]; t0 += 1.0 / rate
    return st(y) + G.breeze(dur, r, 0.3, 0.1, 700) * 0.6


def room(dur, r):  # a quiet bedroom at night
    t = tt(dur); return st(lp(colored(len(t), r, 1.2), 500, 1) * 0.12)


def night(dur, r):  # the terraces at night: soft wind, a far chimney draught
    return G.breeze(dur, r, 0.7, 0.2, 650) + st(lp(colored(ns(dur), r, 1.4), 220, 2) * 0.1)


def mill(dur, r):  # far looms clattering behind the walls + a murmur of workers
    t = tt(dur); y = np.zeros(len(t)); t0 = 0.0
    while t0 < dur - 0.05:
        c = lp(r.standard_normal(ns(0.05)), 1400, 2) * np.exp(-tt(0.05) / 0.012); i = ns(t0); y[i:i + len(c)] += c[: len(y) - i] * 0.5; t0 += 0.16 + 0.02 * r.uniform()
    return st(y) + st(G.babble(dur, r, 170, 0.7, 4.0, 0.6) * 0.08) + G.breeze(dur, r, 0.4, 0.15, 700)


def docks(dur, r):  # foggy London quay: water lapping, a creaking mooring, far murmur
    return G.water_bed(dur, r, 0.25, 0.6) * 0.6 + G.breeze(dur, r, 0.5, 0.2, 600)


def day_room(dur, r):
    return pan(G.bird_chirps(dur, r, 0.5, "sparrow") * 0.07, 0.4) + st(lp(colored(ns(dur), r, 1.2), 500, 1) * 0.08)


def day_street(dur, r):
    return G.breeze(dur, r, 0.8, 0.2, 900) + pan(G.bird_chirps(dur, r, 0.6, "sparrow") * 0.06, -0.3)


def modern(dur, r):
    t = tt(dur); return st(lp(colored(len(t), r, 1.0), 800, 1) * 0.1) + pan(G.bird_chirps(dur, r, 0.4, "sparrow") * 0.04, 0.5)


def glass_tap(r):  # the wire knob tapping a window pane: a bright tok with a short glassy ring
    f = 1500 + 400 * r.uniform()
    y = modal(0.18, [(f * 2.3, 0.4, 0.05), (f * 3.1, 0.2, 0.03)], r) * 0.3; c = G.clink(r, f, 0.07, 0.8) * 0.8; y[: len(c)] += c[: len(y)]
    t = tt(0.05); y[: len(t)] += np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.01) * 0.5
    return np.pad(y, (0, ns(0.1)))


def snore(r, d=1.3):  # a long rasping inhale, then a softer breath out
    t = tt(d); env = np.interp(t, [0, 0.15, 0.6, 0.7, d - 0.05, d], [0, 1, 0.9, 0.2, 0.35, 0])
    flut = 1 + 0.6 * np.sin(2 * np.pi * 28 * t) * (t < 0.65)
    y = bp(colored(len(t), r, 0.6), 90, 900, 2) * env * flut
    return fades(y, 0.02, 0.1)


def pfft(r):  # a pea out of the shooter
    d = 0.14; t = tt(d); return bp(r.standard_normal(len(t)), 700, 4000, 2) * np.exp(-t / 0.03) * 0.8 + np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.02) * 0.3


def tink(r):  # the pea hits the glass
    return np.pad(G.clink(r, 3400 + 500 * r.uniform(), 0.09, 1.0), (0, ns(0.12)))


def steps(r, dur, rate=2.2, scuff=0.4):
    y = np.zeros(ns(dur)); t0 = 0.05
    while t0 < dur - 0.2:
        s = mono(G.stroll_step(r, scuff)); i = ns(t0); y[i:i + len(s)] += s[: len(y) - i] * (0.8 + 0.2 * r.uniform()); t0 += 1 / rate
    return y


def crowd_steps(r, dur):
    return sum(steps(r, dur, 1.8 + 0.4 * k, 0.5) * 0.5 for k in range(4))


def bell(r, f=740, d=2.2):  # the mill bell
    return modal(d, [(f, 1.0, 1.2), (f * 2.0, 0.6, 0.7), (f * 2.76, 0.4, 0.5), (f * 5.4, 0.15, 0.3)], r)


def clang(r):  # the iron gates meeting
    d = 1.6; y = modal(d, [(310, 1.0, 0.7), (470, 0.7, 0.5), (820, 0.5, 0.35), (1340, 0.3, 0.2)], r)
    t = tt(0.06); y[: len(t)] += lp(r.standard_normal(len(t)), 3000, 2) * np.exp(-t / 0.015)
    return y


def coins(r, n=6):
    y = np.zeros(ns(0.9))
    for k in range(n):
        c = G.clink(r, 2200 + 900 * r.uniform(), 0.12); i = ns(r.uniform(0, 0.7)); y[i:i + len(c)] += c[: len(y) - i] * 0.6
    return y


def ring(r, dur, f=(2350, 2950), rate=18):  # an alarm clock: the hammer rattling between two bells
    y = np.zeros(ns(dur)); k = 0; t0 = 0.0
    while t0 < dur - 0.05:
        b2 = modal(0.25, [(f[k % 2], 0.9, 0.12), (f[k % 2] * 2.7, 0.3, 0.05)], r); i = ns(t0); y[i:i + len(b2)] += b2[: len(y) - i] * 0.6; t0 += 1 / rate; k += 1
    return fades(y, 0.01, 0.05)


def many_rings(r, dur):
    return sum(pan(ring(r, dur, (2000 + 300 * k, 2500 + 350 * k), 15 + 2 * k), -0.6 + 0.4 * k) * 0.5 for k in range(4))


def slap(r):  # a hand slapping the clock quiet
    d = 0.3; t = tt(d); return lp(r.standard_normal(len(t)), 2500, 2) * np.exp(-t / 0.02) + np.sin(2 * np.pi * 150 * t) * np.exp(-t / 0.04) * 0.5


def horn(r, d=2.2):  # a far ship's horn in the fog
    t = tt(d); env = np.interp(t, [0, 0.4, d - 0.6, d], [0, 1, 0.8, 0])
    y = sum(np.sin(2 * np.pi * f * t) / (k + 1) for k, f in enumerate([98, 196, 294, 392])) * env
    return lp(y, 700, 2)


def car(r, d=2.2):  # a 70s car going by
    t = tt(d); env = np.exp(-((t - d / 2) / (d / 4)) ** 2)
    y = lp(colored(len(t), r, 0.8), 600, 2) * env + 0.2 * np.sin(2 * np.pi * np.cumsum(70 + 15 * (t < d / 2)) / SR) * env
    return st(y)


def sting(r):  # a low boom + short rising swell (title / question beats)
    d = 1.2; t = tt(d); f = 52 + 28 * np.exp(-t / 0.1)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.4)
    w = np.zeros(len(t)); wh = mono(G.whoosh(0.9, r, 0.6, 300, 2400)); w[: len(wh)] += wh[: len(w)] * 0.5
    return st(boom + w)


def pop(r):  # a label popping on
    return np.asarray(G.whoosh(0.3, r, 0.3, 900, 4000)) * 0.6


def bwomp(r):  # deadpan "nobody"
    d = 0.6; t = tt(d); f = 160 * np.exp(-t / 0.35) + 60
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.25) * 0.8


def taps(t0, t1):  # contact moments of the pole's tap cycle inside [t0, t1)
    n0 = int(np.ceil(t0 * 2.6 - 0.5)); out = []
    while (n0 + 0.5) / 2.6 < t1 - 0.05: out.append((n0 + 0.5) / 2.6); n0 += 1
    return out


EV = [  # (time s, generator, LU vs voice, kind, pan)
    (0.0, lambda: fades(tick_bed(3.77, R), 0.0, 0.1), -27, "bed", 0),
    (3.77, lambda: fades(room(1.85, R), 0.05, 0.1), -32, "bed", 0),
    (3.95, lambda: snore(R, 1.3), -17, "event", -0.2),
    (5.62, lambda: fades(night(7.07, R), 0.05, 0.1), -29, "bed", 0),
    (5.7, lambda: steps(R, 1.05, 2.3), -21, "event", -0.2),          # he walks in
    (12.69, lambda: fades(mill(3.93, R), 0.05, 0.1), -26, "bed", 0),
    (12.75, lambda: bell(R), -18, "event", 0.25),                    # the mill bell
    (12.8, lambda: crowd_steps(R, 1.9), -24, "event", 0.2),
    (14.7, lambda: steps(R, 0.8, 4.2, 0.2), -20, "event", 0.3),      # the latecomer runs
    (14.8, lambda: G.creak(0.6, R, 80, 130, scale=0.6), -22, "event", -0.1),
    (15.38, lambda: clang(R), -15, "event", 0),                      # the gates shut
    (15.82, lambda: coins(R), -18, "event", 0.15),                   # lost pay
    (16.62, lambda: fades(night(4.23, R), 0.05, 0.1), -29, "bed", 0),
    (16.7, lambda: steps(R, 3.0, 2.2), -22, "event", 0),             # walking the dark streets
    (20.85, lambda: fades(room(1.64, R), 0.05, 0.1), -32, "bed", 0),
    (20.95, lambda: snore(R, 1.0), -19, "event", -0.2),
    (22.49, lambda: fades(night(2.69, R), 0.05, 0.1), -29, "bed", 0),
    (24.0, lambda: G.creak(0.35, R, 120, 200, scale=0.5), -24, "event", 0.1),  # the sash creaks as he looks out
    (25.18, lambda: fades(docks(8.35, R), 0.05, 0.1), -27, "bed", 0),
    (25.3, lambda: horn(R), -22, "event", 0.4),                      # a ship's horn on the river
    (25.35, lambda: steps(R, 0.7, 2.6, 0.6), -23, "event", 0.3),     # Mary's steps
    (26.62, lambda: steps(R, 0.8, 2.6, 0.6), -23, "event", -0.1),
    (32.6, lambda: G.clink(R, 2900, 0.25, 1.0), -18, "event", 0.2),  # the sixpence
    (33.53, lambda: fades(night(5.22, R), 0.05, 0.1), -29, "bed", 0),
    (33.65, lambda: sting(R), -16, "event", 0),                      # here's the question
    (35.72, lambda: pop(R), -24, "event", 0.2),                      # the "?"
    (37.05, lambda: bwomp(R), -17, "event", 0),                      # nobody.
    (38.75, lambda: fades(day_room(1.29, R), 0.05, 0.1), -28, "bed", 0),
    (38.85, lambda: snore(R, 1.1), -18, "event", -0.2),
    (40.04, lambda: fades(tick_bed(1.46, R, 3), 0.05, 0.1), -28, "bed", 0),
    (40.3, lambda: fades(many_rings(R, 1.15), 0.02, 0.15), -17, "event", 0),   # cheap alarm clocks ringing
    (41.5, lambda: fades(day_street(1.02, R), 0.05, 0.1), -28, "bed", 0),
    (41.55, lambda: steps(R, 0.95, 1.8, 0.7), -22, "event", 0),      # walking off, out of work
    (42.52, lambda: fades(day_street(3.34, R), 0.05, 0.1), -28, "bed", 0),
    (42.7, lambda: car(R), -24, "event", 0),
    (44.85, lambda: pop(R), -24, "event", 0),                        # 1970s
    (45.86, lambda: fades(modern(3.34, R), 0.05, 0.05), -30, "bed", 0),
    (46.0, lambda: ring(R, 2.1), -16, "event", -0.3),                # the alarm clock
    (48.1, lambda: slap(R), -17, "event", -0.3),
    (10.36, lambda: sting(R), -16, "event", 0),                      # KNOCKER-UPPER
    (25.95, lambda: pop(R), -24, "event", 0.1),                      # MARY SMITH
]
# taps on the glass while the pole is tapping (outside in 5/14/17/28/32, inside the bedroom in 15), each a touch different
for a0, b0, lu, p in [(6.75, 7.86, -17, -0.2), (19.72, 20.85, -19, -0.2), (20.85, 22.49, -16, 0.15), (23.38, 23.9, -18, -0.2), (37.61, 38.75, -21, 0.2), (42.52, 44.69, -22, 0.1)]:
    for k, tq in enumerate(taps(a0, b0)): EV.append((tq, lambda: glass_tap(R), lu - (2 if k % 3 == 2 else 0), "event", p))
# Mary's peas: pfft at each launch, tink when it hits the glass 0.42 s later
for i, t0 in enumerate([29.85, 30.2, 30.55, 30.9]): EV += [(t0, lambda: pfft(R), -19, "event", 0.2), (t0 + 0.42, lambda: tink(R), -18, "event", -0.1)]
for i, t0 in enumerate([31.25, 31.6, 31.95]): EV += [(t0, lambda: pfft(R), -24, "event", 0.3), (t0 + 0.42, lambda: tink(R), -18, "event", -0.1 + 0.1 * i)]


def render():
    v, sr = read_wav(VOICE)
    v = np.asarray(v[0] if v.ndim > 1 else v, float)
    if sr != SR:
        from scipy.signal import resample_poly
        from math import gcd
        g_ = gcd(int(SR), int(sr)); v = resample_poly(v, int(SR) // g_, int(sr) // g_)
    v = hp(v, 85, 2)
    from dsp import peq, shelf
    v = peq(v, 320, -2.5, 1.0); v = peq(v, 3200, 2.5, 0.9); v = shelf(v, 9000, 1.5, "high")
    env = np.sqrt(np.convolve(v ** 2, np.ones(ns(0.008)) / ns(0.008), "same") + 1e-12)
    from scipy.signal import lfilter
    a = np.exp(-1 / ns(0.12)); env = lfilter([1 - a], [1, -a], env)
    ref = np.percentile(env, 90) * 0.5
    v = v * 10 ** (np.where(env > ref, -(1 - 1 / 3) * 20 * np.log10(env / ref), 0.0) / 20)
    v = st(v)
    vref = integrated(v)
    out = np.zeros((2, N)); log = []
    for t0, gen, lu, kind, p in EV:
        x = np.asarray(gen(), float)
        if x.size < 10: continue
        x = pan(x, p) if x.ndim == 1 else x
        cur = momentary_max(x) if kind == "event" else integrated(x)
        tgt = vref + lu + (SFX_DB if kind == "event" else 0.0)
        if np.isfinite(cur): x = x * dbg(tgt - cur)
        place(out, x, t0)
        log.append((round(t0, 2), kind, lu))
    out = hp(out, 30, 2)
    vv = np.zeros((2, N)); vv[:, : min(N, v.shape[1])] = v[:, :N]
    mix = vv + out
    g = dbg(-14.0 - integrated(mix)); mix *= g; out *= g
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    for _ in range(2):
        c = 10 ** (-2.0 / 20); pk = np.max(np.abs(mix), axis=0)
        gl = np.minimum(1.0, c / np.maximum(pk, 1e-9))
        gl = uniform_filter1d(minimum_filter1d(gl, 241), 241)
        mix *= gl[None, :]
        mix *= dbg(-14.0 - integrated(mix))
    tp = true_peak(mix)
    if tp > -1.5: mix *= dbg(-1.5 - tp)
    write_wav(os.path.join(HERE, "knock_sfx_only.wav"), mix, 24)
    write_wav(os.path.join(HERE, "sfx_stem.wav"), out, 24)
    json.dump(log, open(os.path.join(HERE, "cues.json"), "w"))
    print("vref", round(vref, 1), "mix LUFS", round(integrated(mix), 1), "TP", round(true_peak(mix), 1), "events", len(EV), "dur", round(mix.shape[1] / SR, 3))


if __name__ == "__main__":
    render()
