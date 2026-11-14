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
    # id,     anchor (turn, word, nth), mood,   lens note
    # warm light = the Grafton camp (teamwork); cold / night = the Invercauld camp; golden = the payoff
    ("S01", (1, "In", 1), "cold", "HOOK: wide on the cold island, both wrecks in frame (one each end); push in on the Grafton hull and its 1864 board within 2 s"),
    ("S02", (1, "Neither", 1), "cold", "crane from one camp across the island ridge to the other: they can't see each other"),
    ("S03", (1, "On", 2), "lamp", "Grafton camp: heroLow on five men raising a hut; on 'took turns cooking' a pot over a fire, a bowl handed across; 5 MEN on the hut door"),
    ("S04", (1, "Forty", 1), "night", "a painted 40 KM signpost on the ridge, then down to the Invercauld surf: men crawl ashore, then scatter, each alone ('every man for himself')"),
    ("S05", (1, "After", 1), "dusk", "back at the Grafton: the crew building a small boat on the beach (medium, hands working)"),
    ("S06", (1, "three", 1), "day", "three men push the boat off into big grey waves; wide, the boat small against the ocean"),
    ("S07", (1, "All", 1), "golden", "'All five lived': the five together on the beach, close group shot"),
    ("S08", (1, "From", 2), "night", "'only three survived': three figures far apart on a dark shore; slow, still framing"),
    ("S09", (1, "Same", 2), "cold", "'Same island. Same cold. Same storms.': three beats, each a crane higher over the island, both camps in frame"),
    ("S10", (1, "biggest", 1), "golden", "PAYOFF: settle on the Grafton hut's lit window as the five share a meal; slow push, ends 0.6 s after 'other.'"),
]
# Optional: key words for an accent color (captions are all white by default); at most one per sentence.
ACCENT = {(1, "five"), (1, "three"), (1, "difference?")}
# Painted tags: only the story's key facts, on the key object, about one per 15 s. Never on everything.
TAGS = [
    # (turn, word, text, on-object note)
    (1, "1864,", "1864", "painted on a broken hull board of the Grafton wreck, unlit"),
    (1, "five", "5 MEN", "painted on the Grafton hut door"),
    (1, "Forty", "40 KM", "a painted signpost on the ridge between the two camps"),
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
        if a["end"] - a["t"] < 1.5:
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
