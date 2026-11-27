"""Voice-over -> tightened audio + word timings aligned to the approved script.

Usage: python align.py <project> [--no-tighten] [--model small.en]

Reads : 01_script/script.md, 02_voice/<any .mp3/.wav/.m4a>
Writes: 03_timing/vo.wav        (mono 44.1 kHz, pauses tightened, loudness-normalised)
        03_timing/words.json    ([{i, text, start, end}], text = script spelling)
        03_timing/timing_report.md

Pauses: silences longer than MAX_GAP are shortened to TARGET_GAP (reference videos
have ~0.1 s word gaps and never more than 0.3 s).
"""
import argparse, difflib, sys, wave
from pathlib import Path
import numpy as np
from common import d, project_dir, ffmpeg_exe, run, save_json, script_tokens, norm_word

MAX_GAP, TARGET_GAP, SIL_DB = 0.22, 0.12, -42.0
SR = 44100


def load_wav(p):
    with wave.open(str(p)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x


def save_wav(p, x):
    y = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


def tighten(x):
    hop = int(SR * 0.01)
    n = len(x) // hop
    rms = np.array([np.sqrt(np.mean(x[i*hop:(i+1)*hop] ** 2)) + 1e-9 for i in range(n)])
    db = 20 * np.log10(rms)
    silent = db < SIL_DB
    keep = np.ones(len(x), bool)
    i, removed = 0, 0.0
    # trim leading silence to 0.05 s and trailing to 0.3 s
    while i < n and silent[i]:
        i += 1
    lead = max(0, i - 5)
    keep[: lead * hop] = False
    while i < n:
        if silent[i]:
            j = i
            while j < n and silent[j]:
                j += 1
            dur = (j - i) * 0.01
            if j < n and dur > MAX_GAP:
                cut = dur - TARGET_GAP
                a = i * hop + int(SR * TARGET_GAP / 2)
                keep[a : a + int(SR * cut)] = False
                removed += cut
            elif j >= n:
                keep[i * hop + int(SR * 0.3):] = False
            i = j
        else:
            i += 1
    return x[keep], removed + lead * 0.01


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--no-tighten", action="store_true")
    ap.add_argument("--model", default="small.en")
    a = ap.parse_args()
    proj = project_dir(a.project)
    vdir, tdir = d(proj, "voice"), d(proj, "timing")
    src = next((p for p in sorted(vdir.iterdir()) if p.suffix.lower() in (".mp3", ".wav", ".m4a", ".flac", ".ogg")), None)
    if not src:
        sys.exit(f"no voice-over audio in {vdir}")
    raw = tdir / "vo_raw.wav"
    run([ffmpeg_exe(), "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", str(SR), str(raw)])
    x = load_wav(raw)
    removed = 0.0
    if not a.no_tighten:
        x, removed = tighten(x)
    tmp = tdir / "vo_tight_tmp.wav"
    save_wav(tmp, x)
    # loudness-normalise the voice to about -18 LUFS (mix target -17.5 once music is added)
    out = tdir / "vo.wav"
    run([ffmpeg_exe(), "-v", "error", "-y", "-i", str(tmp), "-af", "loudnorm=I=-17.5:TP=-1.0:LRA=7", "-ar", str(SR), "-ac", "1", str(out)])
    tmp.unlink(missing_ok=True)

    from faster_whisper import WhisperModel
    model = WhisperModel(a.model, device="cpu", compute_type="int8", download_root=str(Path(__file__).resolve().parent.parent / "models" / "whisper"))
    # feed 16 kHz samples directly (avoids PyAV version issues in faster-whisper's decoder)
    w16 = tdir / "vo_16k.wav"
    run([ffmpeg_exe(), "-v", "error", "-y", "-i", str(out), "-ac", "1", "-ar", "16000", str(w16)])
    with wave.open(str(w16)) as wf:
        a16 = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    w16.unlink(missing_ok=True)
    segs, info = model.transcribe(a16, word_timestamps=True, language="en", vad_filter=False)
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]

    script = (d(proj, "script") / "script.md").read_text(encoding="utf-8")
    toks = script_tokens(script)
    A = [norm_word(t) for t in toks]
    B = [norm_word(h[0]) for h in heard]
    sm = difflib.SequenceMatcher(a=A, b=B, autojunk=False)
    times = [None] * len(toks)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            _, s, e = heard[blk.b + k]
            times[blk.a + k] = [s, e]
    matched = sum(t is not None for t in times)
    # interpolate unmatched tokens between neighbours, weighted by character length
    dur = len(x) / SR
    i = 0
    while i < len(toks):
        if times[i] is None:
            j = i
            while j < len(toks) and times[j] is None:
                j += 1
            t0 = times[i - 1][1] if i > 0 else 0.0
            t1 = times[j][0] if j < len(toks) else dur
            lens = [max(1, len(A[k])) for k in range(i, j)]
            tot, acc = sum(lens), t0
            for k, L in zip(range(i, j), lens):
                seg = (t1 - t0) * L / tot
                times[k] = [acc, acc + seg]
                acc += seg
            i = j
        else:
            i += 1
    words = [{"i": k, "text": toks[k], "start": round(times[k][0], 3), "end": round(times[k][1], 3)} for k in range(len(toks))]
    # enforce monotonic starts
    for k in range(1, len(words)):
        words[k]["start"] = max(words[k]["start"], words[k - 1]["start"] + 0.02)
    save_json(tdir / "words.json", {"duration": round(dur, 3), "words": words})

    wpm = len(toks) / dur * 60
    gaps = [words[k + 1]["start"] - words[k]["end"] for k in range(len(words) - 1)]
    rep = [
        f"# Timing report", "",
        f"- audio: `{src.name}` -> `vo.wav` ({dur:.2f} s, pauses removed: {removed:.2f} s)",
        f"- script words: {len(toks)}; matched to speech: {matched} ({matched / max(1, len(toks)):.0%})",
        f"- speaking rate: {wpm:.0f} wpm (short format target 165-185, long format 200-210)",
        f"- word gaps: median {np.median(gaps):.2f} s, max {max(gaps):.2f} s",
    ]
    if matched / max(1, len(toks)) < 0.85:
        rep.append("- **WARNING:** under 85 % of script words were matched; the voice-over may not follow the approved script.")
    (tdir / "timing_report.md").write_text("\n".join(rep) + "\n", encoding="utf-8")
    print("\n".join(rep))


if __name__ == "__main__":
    main()
