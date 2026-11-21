# Cloud renderer (no PC, no GPU): renders frames of the built page (engine/web) in several headless browsers at once.
#   python3 render.py --web ENGINE/web --out FRAMES_DIR (--list 0,30,60 | --range 0-1475) [--w 540] [--procs 2] [--ms 1] [--sm 2048]
# (--w output width (height = 16/9 w), --ms MSAA samples, --sm shadow map size; one browser per CPU core is fastest)
# Frames land as OUT/f_NNNNN.png. Already rendered frames are skipped (resume-safe; use a NEW out dir after changes).
# Prints "progress done/total eta" lines; finishes with "RENDER DONE". Leave it in the background for long runs.
import argparse, os, subprocess, sys, time, shutil
ap = argparse.ArgumentParser(); ap.add_argument('--web', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--list'); ap.add_argument('--range'); ap.add_argument('--w', type=int, default=540); ap.add_argument('--procs', type=int, default=2)
ap.add_argument('--ms', type=int, default=1); ap.add_argument('--sm', type=int, default=2048)
a = ap.parse_args(); H = os.path.dirname(os.path.abspath(__file__))
fr = [int(x) for x in a.list.split(',')] if a.list else list(range(int(a.range.split('-')[0]), int(a.range.split('-')[1]) + 1))
os.makedirs(a.out, exist_ok=True)
todo = [f for f in fr if not os.path.exists(os.path.join(a.out, 'f_%05d.png' % f))]
print('frames', len(fr), 'to render', len(todo), flush=True)
if not todo: print('RENDER DONE', flush=True); sys.exit(0)
n = max(1, min(a.procs, len(todo))); parts = [todo[i::n] for i in range(n)]   # interleaved: every browser covers the whole film
procs = []; work = []
for j, part in enumerate(parts):
    d = os.path.join(a.out, '_w%d' % j); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    port = 8840 + j
    procs.append(subprocess.Popen([sys.executable, os.path.join(H, 'srv.py'), a.web, d, str(port)], stdout=open(d + '.srv.log', 'w'), stderr=subprocess.STDOUT))
    time.sleep(0.4)
    procs.append(subprocess.Popen(['node', os.path.join(H, 'run.js'), str(port), ','.join(map(str, part)), d, str(a.w), str(a.ms), str(a.sm)], stdout=open(d + '.log', 'w'), stderr=subprocess.STDOUT, cwd=H))
    work.append(d)
t0 = time.time(); last = -1
while True:
    done = sum(len([x for x in os.listdir(d) if x.endswith('.png')]) for d in work)
    if done != last and (done % 20 == 0 or done == len(todo)):
        el = time.time() - t0; eta = el / max(done, 1) * (len(todo) - done)
        print('progress %d/%d  elapsed %dm%02ds  eta %dm%02ds' % (done, len(todo), el // 60, el % 60, eta // 60, eta % 60), flush=True)
    last = done
    if all(os.path.exists(os.path.join(d, 'DONE')) for d in work) or done >= len(todo): break
    if time.time() - t0 > 6 * 3600: print('TIMEOUT', flush=True); break
    time.sleep(3)
for d in work:
    for x in os.listdir(d):
        if x.endswith('.png'): os.replace(os.path.join(d, x), os.path.join(a.out, x))
for p in procs: p.kill()
subprocess.run(['pkill', '-f', 'chrome-headless'], stderr=subprocess.DEVNULL)
errs = [l for d in work for l in open(d + '.log') if 'PAGEERR' in l] + [l for d in work for l in open(d + '.srv.log') if 'ERROR' in l or 'REJECT' in l]
for l in errs[:10]: print(l.strip())
miss = [f for f in fr if not os.path.exists(os.path.join(a.out, 'f_%05d.png' % f))]
print('missing', len(miss), miss[:20]); print('RENDER DONE' if not miss else 'RENDER INCOMPLETE', flush=True)
