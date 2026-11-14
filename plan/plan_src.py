"""Plan source for a vertical inkbeat Short: shots, accents and tags anchored to WORDS of the voice-over, not to seconds.
Re-run after every VO change; the times move with the words. Run it from the project folder; it writes
src/plan.gen.ts and plan.json there (or to the path you pass) and prints a short report.

    python plan/plan_src.py vo/timings.json [src/plan.gen.ts]

timings.json: {"turns": [{"turn": 1, "words": [{"w": "Hello", "t": 0.12, "end": 0.48}, ...]}, ...]}
FIRST edit SHOTS, ACCENT and TAGS below: every anchor must be a word of YOUR voice-over, with the turn number as it
appears in your timings.json (some aligners count turns from 0).

The generated module plugs into the starter's captions:
    import { WORDS, ACCENT_WORDS, DURATION, FPS } from "./plan.gen";
    const chunks = makeChunks(WORDS as unknown as Word[], DURATION / FPS);
    <Captions chunks={chunks} t={t} accent={new Set(ACCENT_WORDS)} />
"""
import json
import re
import sys
from pathlib import Path

FPS = 30
LEAD = 2  # captions appear 2 frames before the word (applied by makeChunks in core/captions.tsx)

# ---- the story, by words ---------------------------------------------------------------------------------------
# A shot is a setup (a set, a mood, a lens). Inside it the beat rig moves the camera about once a second (SKILL.md
# section 1); change setups only where the picture must change (a new subject, a reaction, the payoff).
SHOTS = [
    # id, anchor (turn, word, nth), mood, picture. About one beat a second (60 BPM), every cut on a word.
    ("B01", (1, "In", 1), "storm", "HOOK: a gale at night; from the wave tops, the schooner heels toward the shore as lightning strikes"),
    ("B02", (1, "two", 1), "storm", "close-up on deck: a sailor's face as he sees the rocks"),
    ("B03", (1, "wrecked", 1), "storm", "IMPACT: the schooner grounds, shudders, her foremast goes over in the spray"),
    ("B04", (1, "cold", 1), "storm", "the big Invercauld breaking up under a wall of cliffs; tilt up the cliff as a mast falls"),
    ("B05", (1, "just", 1), "day", "the chart: one island, two crosses at opposite ends"),
    ("B06", (1, "Neither", 1), "overcast", "grey dawn: a Grafton man looks up at the wall of forest; crane over his shoulder"),
    ("B07", (1, "knew", 1), "overcast", "the match: an Invercauld man under the cliffs; tilt up 36 m of basalt"),
    ("B08", (1, "On", 2), "overcast", "five men carry one spar up the beach; the camera backs away ahead of them"),
    ("B09", (1, "built", 1), "overcast", "the hut goes up (time-lapse) while they hammer and bring thatch"),
    ("B10", (1, "took", 1), "dusk", "one stirs the pot and hands a mug across the fire"),
    ("B11", (1, "and", 1), "dusk", "all five round the fire in front of the finished hut; a slow arc"),
    ("B12", (1, "Forty", 1), "day", "the chart: the camera flies the 40 km north from one cross to the other"),
    ("B13", (1, "nineteen", 1), "overcast", "nineteen men on the ledge under the cliffs; drift in from the surf"),
    ("B14", (1, "crawled", 1), "overcast", "at rock level, a man drags himself out of the foam toward us"),
    ("B15", (1, "and", 2), "overcast", "one reaches up for help; the other turns his back and walks away"),
    ("B16", (1, "himself", 1), "overcast", "straight down from the cliff top: nineteen figures drift apart"),
    ("B17", (1, "After", 1), "overcast", "a man cuts a notch into the tally post; push-in on the marks"),
    ("B18", (1, "the", 5), "break", "hammer on the gunwale, close"),
    ("B19", (1, "their", 1), "break", "the camera rises: the finished boat with all five around her"),
    ("B20", (1, "and", 3), "break", "over the shoulders of the two who stay, the boat stands out with three aboard"),
    ("B21", (1, "open", 1), "storm", "the boat, tiny on a mountain of grey water; the camera comes down to her"),
    ("B22", (1, "All", 1), "break", "the camera tracks close along five faces; five gold figures count up"),
    ("B23", (1, "From", 2), "overcast", "nineteen stand on the ledge; nineteen figures on screen"),
    ("B24", (1, "only", 1), "overcast", "three men on an empty ledge; the count drops to three"),
    ("B25", (1, "Same", 2), "day", "the whole chart, both crosses and the route"),
    ("B26", (1, "Same", 3), "storm", "one survivor alone in the dark, arms round himself, shaking"),
    ("B27", (1, "Same", 4), "storm", "a sea bursts against the ledge and the cliff in a lightning flash"),
    ("B28", (1, "The", 8), "fire", "out of the dark, the one warm place: five men round a fire"),
    ("B29", (1, "How", 1), "fire", "close: one man puts a hot mug into another's hands; push-in to the end"),
]
# Optional: key words for an accent color (captions are all white by default); at most one per sentence.
ACCENT = {(1, "five"), (1, "three"), (1, "difference?")}
# Painted tags: only the story's key facts, on the key object, about one per 15 s. Never on everything.
TAGS = [
    # (turn, word, text, where). Nothing is painted on the world any more (no invented signs): facts live on the chart
    # and in the on-screen count.
    (1, "Forty", "40 KM", "on the chart, along the route between the two crosses"),
    (1, "All", "5 / 5", "five gold figures on screen"),
    (1, "only", "3 / 19", "nineteen figures on screen, sixteen go dark"),
]


def norm(w):
    """the same normalization as core/captions.tsx: lowercase, keep letters, digits, ' and -"""
    return re.sub(r"[^a-z0-9'-]", "", w.lower())


def load(p):
    words = []
    for tr in json.loads(Path(p).read_text(encoding="utf8"))["turns"]:
        for w in tr["words"]:
            words.append({"turn": tr["turn"], "w": w["w"], "t": w["t"], "end": w["end"]})
    if not words:
        raise SystemExit(f"no words in {p}")
    return words


def find(words, turn, word, nth=1):
    k = 0
    for w in words:
        if w["turn"] == turn and norm(w["w"]) == norm(word):
            k += 1
            if k == nth:
                return w
    turns = sorted({w["turn"] for w in words})
    raise SystemExit(f"anchor not found: turn {turn} word {word!r} #{nth} (turns in this file: {turns}); "
                     "edit SHOTS / ACCENT / TAGS to words of your voice-over")


def chunk_count(words):
    """the same 1-2 word rule as makeChunks() in core/captions.tsx, for the report"""
    letters = lambda s: len(re.sub(r"[^a-z0-9]", "", s.lower()))
    i = n = 0
    while i < len(words):
        w = words[i]["w"]
        nx = words[i + 1]["w"] if i + 1 < len(words) else None
        two = nx is not None and not re.search(r"[.?!,]$", w) and letters(w) <= 4 and letters(nx) <= 5 \
            and letters(w) + letters(nx) <= 9
        i += 2 if two else 1
        n += 1
    return n


def main(p, out):
    out = Path(out)
    if not out.parent.is_dir():
        raise SystemExit(f"{out.parent} does not exist: run this from the project folder or pass the output path")
    words = load(p)
    total = words[-1]["end"] + 0.6
    shots = []
    for i, (sid, (tn, wd, nth), mood, note) in enumerate(SHOTS):
        t0 = 0.0 if i == 0 else find(words, tn, wd, nth)["t"]
        shots.append({"id": sid, "t": round(t0, 3), "mood": mood, "note": note})
    for a, b in zip(shots, shots[1:] + [{"t": total}]):
        a["end"] = round(b["t"], 3)
        if a["end"] - a["t"] < 0.4:
            print(f"WARN {a['id']} is only {a['end'] - a['t']:.2f} s")
    for tn, wd in ACCENT:
        find(words, tn, wd)  # every accent word must exist
    accent_words = sorted({norm(wd) for _, wd in ACCENT})
    tags = [{"text": tx, "t": round(find(words, tn, wd)["t"], 3), "note": nt} for tn, wd, tx, nt in TAGS]
    print(f"{len(shots)} shots, {chunk_count(words)} caption chunks, {len(accent_words)} accent words, "
          f"{len(tags)} tags, {total:.2f} s")
    if len(accent_words) > max(1, total / 4):
        print("WARN too many accents: about one per sentence")
    if len(tags) > max(1, total / 15 + 1):
        print("WARN too many tags: about one per 15 s, key facts only")
    rows = [[w["w"], round(w["t"], 3), round(w["end"], 3)] for w in words]
    out.write_text(
        "// generated by plan/plan_src.py; do not edit\n"
        f"export const FPS = {FPS};\nexport const DURATION = {round(total * FPS)};\n"
        f"export const SHOTS = {json.dumps(shots)} as const;\n"
        "/** [text, onset s, end s] for makeChunks() in core/captions.tsx */\n"
        f"export const WORDS = {json.dumps(rows)} as const;\n"
        f"export const ACCENT_WORDS = {json.dumps(accent_words)} as const;\n"
        f"export const TAGS = {json.dumps(tags)} as const;\n", encoding="utf8")
    plan = out.parent.parent / "plan.json" if out.parent.name == "src" else out.with_suffix(".json")
    plan.write_text(json.dumps({"fps": FPS, "duration_s": round(total, 3), "shots": shots,
                                "accent_words": accent_words, "tags": tags}, indent=1), encoding="utf8")
    print("wrote", out, "and", plan)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "vo/timings.json", sys.argv[2] if len(sys.argv) > 2 else "src/plan.gen.ts")
