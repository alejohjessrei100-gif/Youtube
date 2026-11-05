# Word-timed captions (1-2 words each) burned into the short, in the "bold white + thick black outline" style.
# usage: python3 captions.py words.json out.ass
# Groups words in pairs, but never across punctuation or a pause, and long words stand alone. Each caption starts on its
# first word and holds until the next caption (or 0.2 s after its last word when a pause follows). Pop-in: 85 % -> 100 %.
import json, re, sys
words = json.load(open(sys.argv[1]))["words"]
SPOKEN = {"1739": "1739"}  # the narrator says "seventeen thirty-nine": shown as the year
clean = lambda w: re.sub(r"[^\w'\-]", "", w).lower()
# phrasing written from the script (1-2 words, natural breaks), matched in order against the spoken words
PHRASES = """in 1739|britain|went to|war|with spain|over a|single|ear|captain|robert|jenkins|said|spanish|coast guards|had cut|it off|
eight years|earlier|nobody|cared|then he|told|parliament|crowds|roared|the prime|minister|didn't even|want|a war|but|the crowd|won|
wait|all that|over an|ear|you see|the ear|was just|an excuse|the real|fight|was over|trade|and smuggling|even|the name|came later|
a historian|made it|up|over a|century|after|history|forgot|the trade|deals|it remembered|the ear"""
groups, i = [], 0
for ph in [p.strip() for p in PHRASES.replace("\n", "").split("|")]:
    g = []
    for token in ph.split():
        assert clean(words[i]["w"]) == token, (i, words[i]["w"], token)
        g.append(words[i]); i += 1
    groups.append(g)
assert i == len(words), (i, len(words))
def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"
lines = []
for k, g in enumerate(groups):
    a = g[0]["s"] - 0.03
    nxt = groups[k + 1][0]["s"] - 0.03 if k + 1 < len(groups) else None
    b = g[-1]["e"] + 0.2
    if nxt is not None: b = nxt if nxt - g[-1]["e"] < 0.35 else min(b, nxt)
    text = " ".join(SPOKEN.get(clean(w["w"]), clean(w["w"])) for w in g)
    lines.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{{\\fscx85\\fscy85\\t(0,90,\\fscx100\\fscy100)}}{text}")
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1440
PlayResY: 2560
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Montserrat Black,150,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,13,7,2,50,50,470,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
open(sys.argv[2], "w").write(head + "\n".join(lines) + "\n")
print(len(groups), "captions")
for g in groups: print(f"{g[0]['s']:6.2f}  {' '.join(clean(w['w']) for w in g)}")
