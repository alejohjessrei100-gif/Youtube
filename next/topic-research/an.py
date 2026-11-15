import json,re,statistics as st
ch=json.load(open('channels.json')); sh=json.load(open('shorts.json'))
rows=[]
for cid,v in sh.items():
    if len(v)<12: continue
    med=st.median([x[0] for x in v])
    if med<=0: continue
    h,f,_=ch[cid]
    for views,t in v: rows.append((views/med,views,h,f,t,cid))
print(len(rows),'shorts from',len({r[5] for r in rows}),'channels (>=12 shorts each)')
themes={
 'why/how mechanism ("Why X", "How X")':r"^(why|how)\b",
 'psychology / experiment':r"psycholog|experiment|brain|mind|human behavio|cognitive|social",
 'gambling / casino / lottery / slot':r"gambl|casino|lotter|slot|poker|jackpot|bet\b|betting|dice",
 'scam / con / fraud / fake / rigged':r"scam|con man|fraud|fake|rigged|cheat|forg|counterfeit|swindl|trick",
 'Japan':r"japan|samurai|tokyo|ninja",
 'prison / escape / heist / robbery':r"prison|escape|heist|robb|burglar|thief|stole|steal|jail|inmate",
 'ancient / Rome / Egypt / medieval / Viking':r"ancient|roman|rome|egypt|greek|pharaoh|medieval|viking|knight|castle|empire|emperor",
 'WWII / war / army / battle':r"ww2|wwii|world war|nazi|soldier|army|battle|war\b|military|general|navy",
 'ships / sailors / pirates / sea':r"ship|sailor|pirate|ocean|sea\b|captain|titanic|submarine|boat",
 'survival / lost / stranded':r"surviv|stranded|lost|trapped|alone|deserted",
 'disaster / explosion / collapse':r"disaster|explo|collaps|fire\b|crash|sink|sank|flood|bomb|tragedy",
 'invention / engineering / rail / machine':r"invent|engineer|built|build|bridge|rail|train|machine|design|tower|tunnel",
 'mystery / secret / unsolved':r"mystery|secret|unsolved|disappear|vanish|hidden|unknown",
 'strange / weird':r"strange|weird|bizarre|odd\b",
 'money / price / tax / bank':r"money|tax|price|cost|rich|poor|bank|coin|gold|dollar|\$",
 'space / NASA':r"space|nasa|apollo|moon|astronaut|mars|rocket",
 'laws / rules / banned':r"law\b|laws\b|rule|banned|illegal|forbidden|ban\b",
 'animals':r"\b(dog|cat|horse|bird|animal|shark|wolf|bear|monkey)s?\b",
 'death / killed / murder':r"death|dead|died|kill|murder|execut",
}
out=[]
for name,rx in themes.items():
    m=[r for r in rows if re.search(rx,r[4],re.I)]
    chs={r[5] for r in m}
    if len(m)<15: continue
    out.append((st.median([r[0] for r in m]),name,len(m),len(chs),sum(1 for r in m if r[1]>=1_000_000)/len(m)))
print('\nTHEME: median views vs that channel own median | n shorts | n channels | share with 1M+ views')
for r in sorted(out,reverse=True): print(f"{r[0]:5.2f}x  {r[1]:48s} n={r[2]:4d} ch={r[3]:3d}  1M+: {r[4]*100:4.1f}%")
print('\nTOP SHORTS BY RATIO (300k+ views), max one per channel:')
seen=set(); n=0
for r in sorted(rows,reverse=True):
    if r[1]<300000 or r[5] in seen: continue
    seen.add(r[5]); print(f"{r[0]:6.1f}x {r[1]:>10,d} {r[2][:20]:20s} {r[4][:78]}"); n+=1
    if n>=45: break
