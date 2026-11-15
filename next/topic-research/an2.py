import json,re
ch=json.load(open('channels.json')); sh=json.load(open('shorts.json'))
rx=re.compile(r"\b(why|how|real reason|secret|ancient|roman|rome|egypt|medieval|viking|knight|ww2|world war|history|invent|scam|fraud|rigged|spy|heist|prison|ship|pirate|empire|king|law|banned|town|village|island|bridge|rail|ship|lottery|casino|experiment|psycholog)\b",re.I)
bad=re.compile(r"minecraft|roblox|fortnite|prank|funny|ish\b|trolagem|villager|league|skibidi|anime|reaction|gameplay|asmr|tiktok|vs\b",re.I)
rows=[]
for cid,v in sh.items():
    h,f,_=ch[cid]
    for views,t in v:
        if views>=1_000_000 and rx.search(t) and not bad.search(t): rows.append((views,h,f,t))
rows.sort(reverse=True)
seen=set()
for views,h,f,t in rows:
    k=t.lower()[:30]
    if k in seen: continue
    seen.add(k); print(f"{views:>11,d}  {h[:22]:22s} {f:>8,d}  {t[:90]}")
    if len(seen)>=70: break
