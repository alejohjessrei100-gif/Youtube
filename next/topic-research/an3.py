import json,re,statistics as st
ch=json.load(open('channels.json')); sh=json.load(open('shorts.json'))
es_rx=re.compile(r"[áéíóúñ¿¡]|\b(futbol|fútbol|historia|curiosidades|gol|equipo|partido|jugador|mundial|el|la|los|las|del|que|por|una)\b",re.I)
rows=[];chmed={}
for cid,v in sh.items():
    if len(v)<12: continue
    med=st.median([x[0] for x in v])
    if med<=0: continue
    h,f,_=ch[cid]
    es=sum(1 for _,t in v if es_rx.search(t))/len(v)>0.5
    chmed[cid]=(h,f,med,es,len(v))
    for views,t in v: rows.append((views/med,views,h,f,t,cid,es))
print(len(rows),'shorts from',len(chmed),'channels')
for lang,flag in (('Spanish-titled',True),('English-titled',False)):
    m=[c for c in chmed.values() if c[3]==flag]
    if m: print(f"{lang}: {len(m)} channels, median of channel-median views per Short = {st.median([c[2] for c in m]):,.0f}, top channel median {max(c[2] for c in m):,.0f}")
T={
 'rules / invented / origin / why-how':r"^(why|how)\b|rule|invent|origin|history of|banned|created|first ever|por qu|cómo|como se|origen|regla",
 'World Cup / Euro / Copa':r"world cup|euro 20|euros\b|copa|afcon|mundial|eurocopa",
 'penalty / shootout':r"penalt|shootout|shoot-out|penal\b|penales",
 'goalkeeper':r"goalkeeper|keeper|goalie|portero|arquero",
 'referee / VAR':r"referee|\bvar\b|ref\b|arbitr|offside|fuera de juego",
 'transfer / money / wages / salary':r"transfer|fee|million|salary|wage|€|\$|£|fichaje|millones|sueldo",
 'underdog / comeback / miracle':r"underdog|fairytale|impossible|5000|against all odds|comeback|remontada|miracle|milagro|cinderella",
 'derby / rivalry / clásico':r"derby|rival|clasico|clásico",
 'tactics / formation / pressing':r"tactic|formation|pressing|false 9|gegen|táctic|formaci",
 'records / most / fastest':r"record|most\b|fastest|youngest|oldest|never|récord|nunca",
 'Messi / Ronaldo':r"messi|ronaldo|cr7",
 'Maradona / Pelé / legends':r"maradona|pel[eé]\b|zidane|cruyff|ronaldinho|zlatan|beckham|ronaldo nazario|neymar|mbapp",
 'war / politics / ban':r"\bwar\b|guerra|political|nazi|dictator|ban\b",
 'death / tragedy / heartbreak':r"death|died|tragedy|heartbreak|muerte|murió|tragedia|cry",
 'stadium / fans / ultras':r"stadium|fans|ultra|estadio|hinchas|crowd|atmosphere",
 'trophy / cup stolen / lost':r"trophy|trofeo|stolen|lost",
 'quiz / guess / can you':r"guess|quiz|can you|adivina",
}
out=[]
for n,rx in T.items():
    m=[r for r in rows if re.search(rx,r[4],re.I)]
    if len(m)<12: continue
    out.append((st.median([r[0] for r in m]),n,len(m),len({r[5] for r in m}),sum(1 for r in m if r[1]>=1e6)/len(m),st.median([r[1] for r in m])))
print('\nTHEME: median vs own-channel median | n | channels | 1M+ share | median views')
for r in sorted(out,reverse=True): print(f"{r[0]:5.2f}x  {r[1]:42s} n={r[2]:4d} ch={r[3]:3d} 1M+={r[4]*100:4.1f}%  med={r[5]:>9,.0f}")
print('\nTOP SHORTS by views (>=2M), max 2 per channel, story/explainer-looking:')
bad=re.compile(r"highlights|extended|full match|vs\b|fifa|efootball|pes\b|ea fc|gameplay|prank|funny|skills|goals compilation|reaction",re.I)
cnt={};n=0
for r in sorted(rows,key=lambda x:-x[1]):
    if r[1]<2e6 or bad.search(r[4]) or cnt.get(r[5],0)>=2: continue
    cnt[r[5]]=cnt.get(r[5],0)+1; print(f"{r[1]:>11,d} {r[2][:20]:20s} {r[3]:>8,d}  {r[4][:84]}"); n+=1
    if n>=45: break
