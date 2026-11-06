"""Football SFX generated in code (numpy only): whistle, ball_kick, net_swish, stadium_chant.

    python3 football_sfx.py <out_dir>   -> writes one preview WAV per sound
Import and place the arrays yourself for a mix (48 kHz mono float32, peak ~0.9).
"""
import sys, os, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(11)


def _t(d): return np.arange(int(d * SR)) / SR
def _noise(d): return rng.standard_normal(int(d * SR))
def _norm(x, peak=0.9): return (x / (np.max(np.abs(x)) + 1e-9) * peak).astype(np.float32)


def _onepole(x, k):
    """One-pole low-pass, k in (0,1]; vectorised via an IIR loop on a short signal."""
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += k * (v - acc); y[i] = acc
    return y


def _bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def whistle(kind="long"):
    """Referee pea whistle. kind: 'pip' (0.18 s), 'long' (0.8 s), 'full_time' (pip-pip-looong)."""
    if kind == "full_time":
        gap = np.zeros(int(.12 * SR))
        return _norm(np.concatenate([whistle("pip"), gap, whistle("pip"), gap, whistle("long"), np.zeros(int(.2 * SR))]))
    d = .18 if kind == "pip" else .8
    t = _t(d)
    trill = 1 - .45 * (.5 + .5 * np.sin(2 * np.pi * 34 * t)) ** 2  # pea rattle (smooth, no clicks)
    f = 3050 + 140 * np.sin(2 * np.pi * 34 * t)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + .25 * np.sin(2 * 2 * np.pi * np.cumsum(f) / SR)
    breath = _bandpass(_noise(d), 2000, 6000) * .35
    env = np.minimum(1, t / .015) * np.minimum(1, (d - t) / .04)
    return _norm((tone * trill + breath) * env)


def ball_kick(power=1.0):
    """Boot on leather: low body thump + bright slap + tiny air tail. power 0.3..1.5."""
    d = .35; t = _t(d)
    body = np.sin(2 * np.pi * np.cumsum(95 + 160 * np.exp(-t * 60)) / SR) * np.exp(-t * 22)
    slap = _bandpass(_noise(d), 900, 4500) * np.exp(-t * 140) * 1.4
    air = _bandpass(_noise(d), 3000, 9000) * np.exp(-t * 18) * .08 * power
    return _norm((body * power + slap) * np.minimum(1, t / .0015))


def net_swish(d=0.7):
    """Ball into the net: a soft whump, then rope rustle that ripples and dies."""
    t = _t(d)
    whump = _onepole(_noise(d), .05) * np.exp(-t * 14) * 3
    rustle = _bandpass(_noise(d), 1500, 7000) * (np.abs(np.sin(2 * np.pi * 23 * t)) ** 3) * np.exp(-t * 5)
    swish = _bandpass(_noise(d), 600, 3000) * np.sin(np.pi * np.clip(t / .35, 0, 1)) * .5
    return _norm(whump + rustle * 1.2 + swish)


def stadium_chant(d=4.0, words=3, bpm=118, root=196.0):
    """Crowd chanting a simple 3-syllable call ('U-NI-TED' shaped) over a stadium roar bed.
    ~60 detuned voices with vowel formants, loose timing, plus diffuse crowd noise."""
    t = _t(d); out = np.zeros_like(t)
    beat = 60 / bpm
    melody = [1.0, 1.0, 1.335] if words == 3 else [1.0] * words      # last syllable up a fourth
    vowels = [(300, 870), (270, 2290), (530, 1840)]                   # oo, ee, eh formants (F1, F2)
    for v in range(60):
        det = 1 + rng.normal(0, .012); late = rng.normal(0, .025); g = rng.uniform(.4, 1)
        k = 0; start = 0.15
        while start < d - .3:
            for i, m in enumerate(melody):
                on = start + i * beat + late; dur = beat * (1.6 if i == len(melody) - 1 else .8)
                a, b = int(on * SR), int(min(d, on + dur) * SR)
                if a >= len(t) or b <= a: continue
                tt = t[a:b] - on; f0 = root * m * det
                saw = 2 * ((f0 * tt) % 1) - 1
                env = np.minimum(1, tt / .04) * np.minimum(1, (dur - tt) / .08)
                out[a:b] += saw * env * g
            start += beat * (len(melody) + 1)
            k += 1
    # vowel colour: two broad formant bands
    sung = sum(_bandpass(out, f - f * .35, f + f * .35) for f in (500, 1500)) + _bandpass(out, 150, 400) * .5
    roar = _onepole(_noise(d), .08) * 1.5 + _bandpass(_noise(d), 300, 2500) * .6
    roar *= .7 + .3 * np.sin(2 * np.pi * .4 * t) ** 2
    fade = np.minimum(1, t / .3) * np.minimum(1, (d - t) / .3)
    return _norm((_norm(sung) * 1.0 + _norm(roar) * .45) * fade)


SOUNDS = {
    "whistle_pip": lambda: whistle("pip"),
    "whistle_long": lambda: whistle("long"),
    "whistle_full_time": lambda: whistle("full_time"),
    "ball_kick": ball_kick,
    "ball_kick_soft": lambda: ball_kick(.4),
    "net_swish": net_swish,
    "stadium_chant": stadium_chant,
}


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "sfx_preview"
    os.makedirs(out, exist_ok=True)
    for name, fn in SOUNDS.items():
        write_wav(os.path.join(out, name + ".wav"), fn()); print("wrote", name)
