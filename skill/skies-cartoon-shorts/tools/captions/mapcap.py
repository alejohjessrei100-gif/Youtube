# script words -> caption tokens with times from the aligned words:  python3 mapcap.py script.txt words.json caps.json
# NUM: how numbers / abbreviations in the script are spoken (add entries for each video, e.g. "1970s": "nineteen seventies")
import json, re, difflib, sys
NUM = {"1970s": "nineteen seventies", "2000": "two thousand", "1912": "nineteen twelve", "US": "u s", "U.S.": "u s"}
def norm_tok(t):
    core = t.strip('"“”\'‘’:;')
    core_np = re.sub(r"[.,!?]+$", "", core)
    if core_np in NUM: return NUM[core_np].split()
    w = core_np.lower().replace("’", "'").replace("—", " ")
    return [x for x in re.split(r"[-\s]+", w) if x]
def build(script, words):
    toks = script.split()
    disp = []; seq = []; owner = []
    for i, t in enumerate(toks):
        d = t.replace('"', '').replace('“', '').replace('”', '').rstrip(':')
        if d.endswith(','): pass
        disp.append(d)
        for w in norm_tok(t): seq.append(w); owner.append(i)
    aw = [w["w"].lower() for w in words]
    sm = difflib.SequenceMatcher(a=seq, b=aw, autojunk=False)
    m = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): m[a + k] = b + k
    span = {}
    for si, ti in enumerate(owner):
        if si in m:
            s, e = words[m[si]]["s"], words[m[si]]["e"]
            if ti in span: span[ti] = (min(span[ti][0], s), max(span[ti][1], e))
            else: span[ti] = (s, e)
    miss = [disp[i] for i in range(len(toks)) if i not in span]
    # interpolate missing tokens between neighbours
    out = []
    for i in range(len(toks)):
        if i in span: out.append([disp[i], *span[i], 1])
        else:
            p = max([j for j in span if j < i], default=None); q = min([j for j in span if j > i], default=None)
            s = span[p][1] if p is not None else 0; e = span[q][0] if q is not None else s + 0.3
            out.append([disp[i], s, e, 0])
    while out and not out[-1][3]: out.pop()
    return out, miss, sm.ratio()
if __name__ == "__main__":
    script = open(sys.argv[1]).read(); words = json.load(open(sys.argv[2]))
    out, miss, r = build(script, words)
    print("ratio %.3f tokens %d missing %s" % (r, len(out), miss))
    json.dump(out, open(sys.argv[3], "w"))
