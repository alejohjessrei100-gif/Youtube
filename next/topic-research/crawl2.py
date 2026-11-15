import subprocess, json, urllib.parse, sys, collections
from concurrent.futures import ThreadPoolExecutor
YT='../yt/bin/yt-dlp'
SEEDS=["football history shorts","soccer history shorts","football facts shorts","soccer stories shorts","football explained shorts","football rules explained shorts","world cup history shorts","world cup stories shorts","football tactics explained shorts","weird football moments shorts","football legends story shorts","football transfer stories shorts","football myths shorts","football animated story shorts","football untold stories","soccer why shorts","futbol historia shorts","datos curiosos futbol shorts","historia del futbol shorts","futbol curiosidades shorts","football referee stories shorts","football stadium stories shorts","football underdog stories shorts","football penalty shootout stories shorts","football goalkeeper stories shorts"]
def run(args,t=60):
    try: return subprocess.run(args,capture_output=True,text=True,timeout=t).stdout
    except Exception as e: return ''
def seed(q):
    u="https://www.youtube.com/results?search_query="+urllib.parse.quote_plus(q)+"&sp=EgIQAg%253D%253D"
    out=run([YT,'--flat-playlist','-I','1:20','--print','%(channel_id)s|%(uploader_id)s|%(channel_follower_count)s|%(title)s',u])
    rows=[]
    for l in out.splitlines():
        p=l.split('|',3)
        if len(p)==4: rows.append(p)
    return rows
ch={}
with ThreadPoolExecutor(6) as ex:
    for rows in ex.map(seed,SEEDS):
        for cid,h,f,t in rows:
            try: f=int(f)
            except: continue
            if 20000<=f<=4000000 and h.startswith('@'): ch[cid]=(h,f,t)
print(len(ch),'channels',file=sys.stderr)
json.dump(ch,open('channels.json','w'))
def shorts(item):
    cid,(h,f,t)=item
    out=run([YT,'--flat-playlist','-I','1:40','--print','%(view_count)s|%(title)s',f'https://www.youtube.com/channel/{cid}/shorts'],90)
    rows=[]
    for l in out.splitlines():
        p=l.split('|',1)
        try: rows.append((int(p[0]),p[1]))
        except: pass
    return cid,rows
res={}
with ThreadPoolExecutor(6) as ex:
    for cid,rows in ex.map(shorts,list(ch.items())):
        res[cid]=rows
json.dump(res,open('shorts.json','w'))
print('done',sum(len(v) for v in res.values()),'shorts',file=sys.stderr)
