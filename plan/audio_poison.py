"""Sound for the poison short: the 1.25x voice as recorded, a light comedic plucked loop at 110 BPM (twice the 55 BPM
camera grid), room beds per set, and hits on the cuts and jokes. Reuses audio_beirut.py helpers.
    python plan/audio_poison.py -> out/audio/premaster_poison.wav, then plan/master_poison.sh"""
import re, sys, wave, json, subprocess
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
import audio_beirut as A
ROOT = Path(__file__).resolve().parent.parent
SR = A.SR
src = (ROOT / "src/poison/timing.gen.ts").read_text()
PH = float(re.search(r"PHASE = ([\d.]+)", src).group(1)); B = 60 / 55
TB = int(re.search(r"TOTAL_BEATS = (\d+)", src).group(1))
SH = json.loads(re.search(r"SHOT_BEATS = (\[.*?\]) as const", src).group(1))
TOTAL = PH + TB * B; N = int(TOTAL * SR)
bt = lambda k: 0.0 if k == 0 else PH + k * B
st = lambda i: bt(SH[i - 1][0])
def pluck(f, dur=0.35):
    n = int(dur * SR); t = A.tt(n)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 9) * A.env(n, 0.002, 0.05)
def music():
    out = np.zeros(N); b = 60 / 110
    prog = [(196.0, [392, 494, 587]), (220.0, [440, 523, 659]), (174.6, [349, 440, 523]), (196.0, [392, 494, 587])]
    for k in range(int(TOTAL / b)):
        r, ch = prog[(k // 4) % 4]
        A.place(out, A.lp(pluck(r / 2, 0.5), 600) * 0.8, k * b, 0)
        if k % 2: A.place(out, A.bp(A.noise(int(0.04 * SR), k), 5000, 11000) * A.env(int(0.04 * SR), 0.001, 0.03) * 0.3, k * b, 0)
        A.place(out, pluck(ch[k % 3], 0.3) * 0.35, k * b + b / 2, 0)
    return out
def main():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ROOT / "out/poison_voice.mp3"), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    v = np.zeros(N); v[: min(N, len(x))] = x[:N]; v = v / np.abs(v).max() * 0.7
    duck = A.lp(np.abs(v), 3, 1); duck /= duck.max() + 1e-9
    srms = A.rms(v[np.abs(v) > 0.02]); t = A.tt(N)
    mus = music(); mus = mus / (A.rms(mus) + 1e-9) * srms * A.db(-20)
    mus *= A.db(-4) ** np.clip(duck * 1.3, 0, 1)
    # the music stops dead for the ending, then the room breathes
    mus *= np.clip((st(17) - t) / 0.05, 0, 1)
    fx = np.zeros(N)
    # recorded CC0 one-shots (OpenGameArt: Kenney Interface Sounds, 100 CC0 SFX, RPG Sound Pack), see out/sfx
    def S(name):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ROOT / "out/sfx" / name), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
        x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
        return x / (np.abs(x).max() + 1e-9)
    P = lambda name, at, pk: A.place(fx, S(name) * 0.7 * A.db(pk), at, 0)
    for i in (2, 4, 9, 13, 15, 17): P("cloth.wav", st(i) - 0.12, -24)          # soft cloth swish on the bigger scene changes
    P("dishes_01.ogg", 0.4, -24)                                              # the feast
    P("bite-small.wav", st(2) + 0.15, -10)                                   # the taster bites the king's food
    for k, n in enumerate(["bite-small2.wav", "bite-small3.wav", "bite-small2.wav"]): P(n, st(3) + 0.2 + k * 0.38, -16)  # chewing
    P("pluck_001.ogg", st(3) + 0.1, -14)                                      # FOOD TASTER
    P("bell_01.ogg", st(4) + 1.2, -16)                                        # PRAEGUSTATOR
    P("plop_01.ogg", st(5) + 0.4, -14)                                        # "guy who goes first"
    P("select_003.ogg", st(6) + 0.1, -16); P("select_003.ogg", st(6) + 1.0, -18)
    P("scratch_001.ogg", st(7) + 0.65, -10); P("hit_02.ogg", st(7) + 0.7, -16)  # ALLEGEDLY: record scratch
    P("error_003.ogg", st(8) + 0.1, -12)                                      # great hire
    P("question_001.ogg", st(9) + 0.3, -14)
    P("gong_01.ogg", st(10) + 0.1, -18)                                       # MITHRIDATES
    for k in range(9): P("tick_001.ogg", st(11) + 0.1 + k * 0.2, -22)         # the day counter
    P("bottle.wav", st(11) + 0.45, -14); P("bubble.wav", st(11) + 0.75, -16); P("burp.wav", st(11) + 1.5, -18)  # sip, gulp
    P("wooden_01.ogg", st(12) + 0.05, -12)                                    # Bold.
    P("coin.wav", st(13) + 0.1, -20); P("magic1.wav", st(13) + 0.8, -12)      # treasure, the magic stone
    P("paper_01.ogg", st(14) + 0.3, -16)                                      # Paré, notebook
    P("chainmail1.wav", st(15) + 0.2, -18)                                    # the guard
    P("confirmation_002.ogg", st(16) + 0.05, -12); P("spell.wav", st(16) + 0.1, -20)  # he got the stone
    P("slam_02.ogg", st(17), -12); P("glass_02.ogg", st(17) + 0.4, -18)       # seven hours later
    room = A.lp(A.noise(N, 4), 500) * np.clip((t - st(15)) / 0.2, 0, 1)
    room = room / (A.rms(room) + 1e-9) * srms * A.db(-30)
    fx *= A.db(-3.5) ** np.clip(duck * 1.3, 0, 1)
    out = (v + fx + mus + room) * np.clip((TOTAL - t) / 0.3, 0, 1)
    (ROOT / "out/audio").mkdir(parents=True, exist_ok=True)
    with wave.open(str(ROOT / "out/audio/premaster_poison.wav"), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    print("total", round(TOTAL, 2))
if __name__ == "__main__":
    main()
