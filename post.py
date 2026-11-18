"""POST: frames + original voice + sparse SFX -> finished 1080p and 4K Shorts in "Final Videos".

Runs ON THE PC through the render queue (Blender's own Python runs it; no install needed):
    queue/<VNAME>_post.job ->  title=... / script=post.py / progress=<VNAME>_post_progress.txt
It reads <VNAME>_post.json from the RobloxAnim folder:
{
  "vname": "food",
  "title": "Whatever_You_Eat",                      # output file name stem
  "src":   "C:\\Users\\<you>\\Downloads\\take1.mp4",   # the ORIGINAL voice recording the creator sent
  "cuts":  "food_cutmap.json",                       # from tools/vo_clean.py (same cuts -> same timing)
  "frames": 1293,                                    # NF of the render (DUR * 30)
  "sfx_dir": "sfx",                                  # folder of .mp3/.wav sound effects on the PC
  "cues": [["whoosh", 2.42, 0.5, 0.35], ...]         # [file stem in sfx_dir, start s, length s, gain] — SPARSE, varied
}
Because Blender passes its own args, the job always calls this same file; which video it posts comes from
<RobloxAnim>/post_target.txt (one line: the VNAME).
"""
import subprocess, glob, os, time, traceback, json, shutil

D = os.path.dirname(os.path.abspath(__file__))
VN = open(os.path.join(D, 'post_target.txt')).read().strip()
CFG = json.load(open(os.path.join(D, VN + '_post.json'), encoding='utf-8'))
OUT = os.path.join(D, 'Final Videos'); os.makedirs(OUT, exist_ok=True)
PROG = os.path.join(D, VN + '_post_progress.txt'); LOG = os.path.join(D, VN + '_post_log.txt')
def lg(*a): open(LOG, 'a', encoding='utf-8').write(time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a) + '\n')
def pr(n): open(PROG, 'w').write('%d 4' % n)
try:
    import ctypes; ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001 | 0x00000040)   # keep the PC awake
except Exception: pass

def find_ffmpeg():
    p = os.path.join(D, 'ffmpeg_path.txt')
    if os.path.exists(p):
        q = open(p).read().strip()
        if os.path.exists(q): return q
    for pat in (os.path.join(D, 'ffmpeg', '**', 'ffmpeg.exe'), r"C:\ffmpeg\**\ffmpeg.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\CapCut\Apps\*\ffmpeg.exe"), os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\**\ffmpeg.exe")):
        g = sorted(glob.glob(pat, recursive=True))
        if g: return g[-1]
    return shutil.which('ffmpeg') or 'ffmpeg'
FF = find_ffmpeg()
NF = int(CFG['frames']); DUR = NF / 30.
SEGS = json.load(open(os.path.join(D, CFG['cuts'])))['cuts']
SRC = CFG['src']; VO = os.path.join(D, VN + '_vo_final.wav'); S = os.path.join(D, CFG.get('sfx_dir', 'sfx'))
FR = os.path.join(D, VN + 'frames')
def run(a, to=3600):
    p = subprocess.run([FF, '-y'] + a, capture_output=True, text=True, timeout=to, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    return p.returncode, p.stderr[-600:]
def sfx_file(stem):
    for ext in ('.mp3', '.wav', '.ogg', '.m4a'):
        f = os.path.join(S, stem + ext)
        if os.path.exists(f): return f
    return None
try:
    lg('ffmpeg', FF); pr(0)
    frames = glob.glob(os.path.join(FR, 'f_*.png')); lg('frames', len(frames))
    if len(frames) < NF: raise RuntimeError('missing frames %d of %d' % (len(frames), NF))
    # 1) the voice, rebuilt from the ORIGINAL recording with the approved cuts (24-bit, no quality loss)
    fc = []
    for i, (a, b) in enumerate(SEGS):
        fc.append('[0:a]atrim=%.3f:%.3f,asetpts=PTS-STARTPTS,afade=t=in:d=0.004,afade=t=out:st=%.3f:d=0.004[s%d]' % (a, b, b - a - .004, i))
    fc.append(''.join('[s%d]' % i for i in range(len(SEGS))) + 'concat=n=%d:v=0:a=1[vo]' % len(SEGS))
    rc = run(['-i', SRC, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s24le', VO]); lg('vo', rc)
    if rc[0] != 0: raise RuntimeError('vo failed ' + rc[1])
    pr(1)
    # 2) frames -> high-quality silent master (GPU encoder first, CPU fallbacks)
    SIL = os.path.join(D, VN + '_silent.mp4'); ok = False
    for enc, opts in (('h264_nvenc', ['-preset', 'p5', '-rc', 'vbr', '-cq', '12', '-b:v', '40M', '-maxrate', '60M']), ('h264_amf', ['-quality', 'quality', '-rc', 'vbr_peak', '-b:v', '40M', '-maxrate', '60M']),
                      ('h264_qsv', ['-global_quality', '14']), ('libx264', ['-preset', 'medium', '-crf', '14']), ('h264_mf', ['-b:v', '40M']), ('mpeg4', ['-q:v', '1'])):
        rc = run(['-framerate', '30', '-i', os.path.join(FR, 'f_%05d.png'), '-c:v', enc] + opts + ['-pix_fmt', 'yuv420p', SIL]); lg('join', enc, rc[0])
        if rc[0] == 0 and os.path.getsize(SIL) > 100000: ok = True; break
    if not ok: raise RuntimeError('join failed ' + rc[1])
    pr(2)
    # 3) mix: voice on top (-14 LUFS), sparse varied SFX tucked under it
    CUES = [c for c in CFG.get('cues', []) if sfx_file(c[0])]
    miss = [c[0] for c in CFG.get('cues', []) if not sfx_file(c[0])]
    if miss: lg('sfx not found, skipped:', miss)
    def mix(out, w, h):
        br, br2 = ('14M', '20M') if w == 1080 else ('45M', '60M')
        args = ['-i', SIL, '-i', VO]
        for n, t, d, g in CUES: args += ['-i', sfx_file(n)]
        fc = ['[0:v]setpts=PTS-STARTPTS' + (',scale=%d:%d:flags=lanczos' % (w, h) if w != 1080 else '') + '[vout]',
              '[1:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-14:TP=-1.5:LRA=11[vo]']
        for i, (n, t, d, g) in enumerate(CUES):
            fc.append('[%d:a]atrim=0:%.2f,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-14:TP=-1.5,volume=%.2f,afade=t=out:st=%.2f:d=0.12,adelay=%d|%d[a%d]' % (i + 2, d, g, max(0, d - .12), int(t * 1000), int(t * 1000), i))
        fc.append('[vo]' + ''.join('[a%d]' % i for i in range(len(CUES))) + 'amix=inputs=%d:normalize=0,alimiter=limit=0.95,apad,atrim=0:%.3f[aout]' % (len(CUES) + 1, DUR))
        last = None
        for enc, opts in (('h264_nvenc', ['-preset', 'p5', '-rc', 'vbr', '-cq', '19', '-b:v', br, '-maxrate', br2]), ('h264_amf', ['-quality', 'quality', '-rc', 'vbr_peak', '-b:v', br, '-maxrate', br2]),
                          ('h264_qsv', ['-global_quality', '20']), ('libx264', ['-preset', 'medium', '-crf', '18']), ('h264_mf', ['-b:v', br]), ('mpeg4', ['-q:v', '2', '-b:v', br2])):
            rc = run(args + ['-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', '[aout]', '-c:v', enc] + opts + ['-pix_fmt', 'yuv420p', '-r', '30', '-t', '%.3f' % DUR, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out])
            last = (enc, rc)
            if rc[0] == 0 and os.path.exists(out) and os.path.getsize(out) > 100000: return last
        raise RuntimeError('mix failed %r' % (last,))
    T = CFG.get('title', VN)
    lg('mix1080', mix(os.path.join(OUT, T + '_1080p.mp4'), 1080, 1920)[0]); pr(3)
    if CFG.get('make_4k', True): lg('mix4k', mix(os.path.join(OUT, T + '_4K.mp4'), 2160, 3840)[0])
    pr(4); open(PROG, 'w').write('DONE'); lg('POST DONE')
except Exception:
    lg('ERROR', traceback.format_exc()); open(PROG, 'w').write('ERROR')
