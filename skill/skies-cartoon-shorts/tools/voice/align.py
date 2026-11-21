# forced alignment of the cleaned voice to the script words (pocketsphinx; pip install pocketsphinx)
#   python3 align.py clean.wav script.txt words.json [extra.dict]
# extra.dict: one line per word missing from the dictionary, "word  PH O N E S" (CMU phones), e.g. "knocker K N AA K ER".
# The script is lower-cased, numbers must be written as spoken (1970s -> nineteen seventies) before aligning.
import sys, json, subprocess, os, re
from pocketsphinx import Decoder, get_model_path
src, script, out = sys.argv[1], sys.argv[2], sys.argv[3]
extra = sys.argv[4] if len(sys.argv) > 4 else None
mp = get_model_path(); base = os.path.join(mp, "en-us", "cmudict-en-us.dict")
words = " ".join(re.sub(r"[^a-z' ]", " ", open(script).read().lower().replace("-", " ")).split())
D = set(l.split()[0].split("(")[0] for l in open(base))
ext = os.path.join(os.path.dirname(os.path.abspath(out)), "ext.dict")
with open(ext, "w") as f:
    f.write(open(base).read())
    if extra: f.write(open(extra).read())
miss = sorted(set(w for w in words.split() if w not in D) - (set(l.split()[0] for l in open(extra)) if extra else set()))
if miss: print("MISSING FROM DICTIONARY (add them to an extra.dict and rerun):", miss); sys.exit(2)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
dec = Decoder(hmm=os.path.join(mp, "en-us", "en-us"), dict=ext, lm=None, loglevel="FATAL", bestpath=False)
dec.set_align_text(words); dec.start_utt(); dec.process_raw(raw, full_utt=True); dec.end_utt()
W = [{"w": s.word.split("(")[0], "s": round(s.start_frame / 100, 3), "e": round((s.end_frame + 1) / 100, 3)} for s in dec.seg() if s.word not in ("<s>", "</s>", "<sil>", "[NOISE]")]
json.dump(W, open(out, "w")); n = len(words.split())
print("aligned", len(W), "of", n, "words;", "first", W[:2], "last", W[-2:])
if len(W) < n * 0.95: print("WARNING: alignment incomplete - check the voice matches the script word for word")
