import subprocess, statistics as st
from concurrent.futures import ThreadPoolExecutor
YT='../yt/bin/yt-dlp'
C={
 "Why the penalty kick was invented (McCrum 1890)":"why penalty kick was invented william mccrum",
 "Why yellow and red cards exist (Ken Aston traffic light)":"ken aston traffic light yellow red card invented",
 "Why goal nets exist (Brodie 1889)":"why goal nets invented brodie",
 "Maradona Hand of God 1986":"maradona hand of god 1986",
 "Leicester City 5000-1 title":"leicester city 5000-1 premier league title story",
 "Greece Euro 2004 underdog":"greece euro 2004 underdog story",
 "Iceland thunderclap Euro 2016":"iceland euro 2016 thunderclap story",
 "Barcelona 6-1 PSG remontada":"barcelona 6-1 psg remontada",
 "Istanbul 2005 Liverpool comeback":"liverpool istanbul 2005 comeback",
 "Why offside rule exists":"why offside rule exists history",
 "Goalkeeper Bert Trautmann broken neck 1956":"bert trautmann broken neck fa cup final",
 "Garrincha the crooked legs":"garrincha story",
 "The Christmas Truce 1914 football":"christmas truce 1914 football match",
 "Death match Kyiv 1942":"death match kiev 1942 football",
 "Wrexham Hollywood takeover":"wrexham reynolds mcelhenney story",
 "Why VAR exists / first VAR use":"why var was introduced story",
 "Pele Santos war stopped (Nigeria civil war ceasefire)":"pele nigeria civil war ceasefire myth",
 "Football War 1969 El Salvador Honduras":"football war 1969 el salvador honduras",
 "Andres Escobar own goal":"andres escobar own goal story",
 "Ronaldo Nazario 1998 final mystery":"ronaldo 1998 world cup final seizure mystery",
 "Zinedine Zidane headbutt 2006":"zidane headbutt 2006 story",
 "Messi growth hormone Barcelona napkin contract":"messi napkin contract barcelona",
 "Diego Costa/ Suarez bite": "suarez bite chiellini",
 "Baggio missed penalty 1994":"roberto baggio missed penalty 1994",
 "Why football balls are 32 panels / Telstar":"telstar football 32 panels why",
 "AFC Wimbledon / fans rebuilt club":"afc wimbledon fans rebuilt club story",
 "Why Brazil wears yellow (1950 loss)":"why brazil wears yellow shirt 1950",
 "Hillsborough/ Heysel":"heysel",
 "Golden goal / silver goal rule":"golden goal rule football why scrapped",
 "Why World Cup trophy was stolen 1966 dog pickles":"world cup trophy stolen 1966 pickles dog",
}
def q(name):
    out=subprocess.run([YT,'--flat-playlist','-I','1:30','--print','%(view_count)s|%(duration)s|%(channel)s',f'ytsearch30:{C[name]}'],capture_output=True,text=True,timeout=90).stdout
    rows=[]
    for l in out.splitlines():
        p=l.split('|')
        try: rows.append((int(p[0]),float(p[1]) if p[1]!='NA' else 999,p[2]))
        except: pass
    sh=[r for r in rows if r[1]<=70]; lg=[r for r in rows if r[1]>70]
    top=lambda a,n=10: sorted(a,reverse=True)[:n]
    return name,len(rows),len(sh),max([r[0] for r in sh],default=0),sum(1 for r in sh if r[0]>=1e6),len({r[2] for r in sh if r[0]>=1e6}),st.median([r[0] for r in top(lg)]) if lg else 0,max([r[0] for r in lg],default=0)
with ThreadPoolExecutor(4) as ex:
    res=list(ex.map(q,C))
print(f"{'story':56s} {'sh':>3s} {'bestShort':>10s} {'1M+':>3s} {'ch':>3s} {'long med10':>10s} {'best long':>11s}")
for r in sorted(res,key=lambda x:-(x[7]+5*x[3])): print(f"{r[0][:56]:56s} {r[2]:3d} {r[3]:10,d} {r[4]:3d} {r[5]:3d} {r[6]:10,.0f} {r[7]:11,d}")
