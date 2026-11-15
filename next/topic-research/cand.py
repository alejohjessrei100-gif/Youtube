import subprocess, statistics as st
from concurrent.futures import ThreadPoolExecutor
YT='../yt/bin/yt-dlp'
C={
 "Great Diamond Hoax 1872 (mine salting)":"great diamond hoax 1872",
 "Mosquito alarm (buzz only teens hear)":"mosquito alarm teenagers high pitch",
 "Plimsoll line on ships":"plimsoll line ship why painted",
 "Garcia-Pelayo beat roulette":"garcia pelayo roulette casino madrid",
 "Johatsu evaporated people Japan":"johatsu japan evaporated people",
 "Shisa kanko pointing and calling Japan trains":"pointing and calling japan trains shisa kanko",
 "Why airplane windows are round (Comet)":"why airplane windows are round comet",
 "Egyptians poured water on sand (pyramid stones)":"egyptians wet sand pyramid stones sled",
 "Great Molasses Flood 1919":"great molasses flood boston 1919",
 "Pennies on Big Ben pendulum":"big ben pennies pendulum clock",
 "Dazzle camouflage warships WW1":"dazzle camouflage ships ww1",
 "Mohan Srivastava scratch lottery (ref covers)":"mohan srivastava scratch lottery",
 "Gimli Glider":"gimli glider",
 "Why casinos have no clocks or windows":"why casinos have no clocks windows",
 "Operation Mincemeat (corpse deception)":"operation mincemeat",
 "The Cottingley Fairies":"cottingley fairies hoax",
 "Roman concrete self-healing":"roman concrete self healing",
 "Why bridges have gaps / expansion joints":"why bridges have gaps expansion joints",
 "Why trains wheels are cone shaped":"why train wheels are cone shaped",
 "Kodokushi / lonely death cleaners Japan":"japan lonely death cleaners kodokushi",
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
with ThreadPoolExecutor(5) as ex:
    res=list(ex.map(q,C))
print(f"{'story':50s} {'n':>3s} {'shorts':>6s} {'bestShort':>10s} {'1M+':>4s} {'chans':>5s} {'long med top10':>14s} {'best long':>11s}")
for r in sorted(res,key=lambda x:-x[3]): print(f"{r[0]:50s} {r[1]:3d} {r[2]:6d} {r[3]:10,d} {r[4]:4d} {r[5]:5d} {r[6]:14,.0f} {r[7]:11,d}")
